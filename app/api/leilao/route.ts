import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { redis, redisPipeline } from "@/lib/redis";
import { limited } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/ip";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { normalizeEmail, normalizePhoneBR } from "@/lib/validate";
import { COTAS, ENCERRA_ISO, INCREMENTO, K_LANCES, K_RANK, LANCE_MAX, LANCE_MIN, encerraMs, limpar, type Lance } from "@/lib/leilao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quanto precisa para entrar entre os vencedores agora (sem revelar quem nem quanto cada um deu). */
async function situacao() {
  const r = await redisPipeline([
    ["ZCARD", K_RANK],
    ["ZREVRANGE", K_RANK, COTAS - 1, COTAS - 1, "WITHSCORES"],
  ]);
  if (!r) return null;
  const total = Number(r[0] ?? 0);
  const corte = Array.isArray(r[1]) && r[1].length === 2 ? Number(r[1][1]) : 0;
  const lotado = total >= COTAS && corte > 0;
  return { total, corte, minimo: lotado ? corte + INCREMENTO : LANCE_MIN };
}

/** Público: prazo, número de cotas e o lance mínimo para entrar. Nada de dados de quem deu lance. */
export async function GET() {
  const s = await situacao();
  return NextResponse.json(
    {
      encerra: ENCERRA_ISO,
      aberto: Date.now() < encerraMs(),
      cotas: COTAS,
      minimo: s?.minimo ?? LANCE_MIN,
      lances: s?.total ?? 0,
      ok: s !== null,
    },
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } },
  );
}

type Corpo = {
  empresa?: unknown;
  nome?: unknown;
  whatsapp?: unknown;
  email?: unknown;
  valor?: unknown;
  obs?: unknown;
  aceite?: unknown;
  website?: unknown; // isca para robôs
  cfToken?: unknown;
};

const erro = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const b = await readJson<Corpo>(req, 4000);
  if (!b || typeof b !== "object") return erro("Requisição inválida.");
  if (typeof b.website === "string" && b.website.length > 0) return NextResponse.json({ ok: true, dentro: false });

  if (Date.now() >= encerraMs()) return erro("Os lances já foram encerrados.", 409);

  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  if ((await limited(`lance:${ipHash}`, 4, 60)) || (await limited(`lanceh:${ipHash}`, 30, 3600))) return erro("Muitas tentativas. Aguarde um minuto.", 429);
  if (!(await verifyTurnstile(b.cfToken, ip))) return erro("Verificação anti-robô falhou. Recarregue a página.");

  const empresa = limpar(b.empresa, 80);
  const nome = limpar(b.nome, 80);
  const email = normalizeEmail(b.email);
  const whatsapp = normalizePhoneBR(b.whatsapp);
  const obs = limpar(b.obs, 300);
  const valor = typeof b.valor === "number" ? Math.floor(b.valor) : Number.NaN;
  if (empresa.length < 2) return erro("Informe o nome da empresa ou marca.");
  if (nome.length < 2) return erro("Informe o nome de quem fala pela empresa.");
  if (!email) return erro("E-mail inválido.");
  if (!whatsapp) return erro("WhatsApp inválido. Use DDD + número.");
  if (!Number.isFinite(valor) || valor < 1 || valor > LANCE_MAX) return erro("Valor do lance inválido.");
  if (b.aceite !== true) return erro("Confirme os termos do leilão para continuar.");

  const s = await situacao();
  if (!s) return erro("O sistema não respondeu. Tente de novo em instantes.", 503);

  const id = createHash("sha256").update(email).digest("hex").slice(0, 24);
  const anterior = await redis<string>(["HGET", K_LANCES, id]);
  let antigo: Lance | null = null;
  try {
    antigo = anterior ? (JSON.parse(anterior) as Lance) : null;
  } catch {
    antigo = null;
  }
  // Cada e-mail tem um lance só, que pode ser aumentado (nunca reduzido): evita encher a lista e "tirar" lance depois.
  if (antigo && valor <= antigo.valor) return erro(`Seu lance atual é R$ ${antigo.valor}. Para mudar, ofereça mais que isso.`, 409);
  if (valor < s.minimo && !(antigo && s.total >= COTAS && antigo.valor >= s.corte)) return erro(`O lance mínimo agora é R$ ${s.minimo}.`, 409);

  const agora = Date.now();
  const lance: Lance = { id, empresa, nome, whatsapp, email, valor, obs, ts: agora, tsPrimeiro: antigo?.tsPrimeiro ?? agora };
  const gravou = await redisPipeline([
    ["HSET", K_LANCES, id, JSON.stringify(lance)],
    ["ZADD", K_RANK, valor, id],
  ]);
  if (!gravou) return erro("Não consegui registrar agora. Tente de novo.", 503);

  const depois = await situacao();
  const dentro = depois ? depois.total < COTAS || valor >= depois.corte : false;
  return NextResponse.json({ ok: true, dentro, minimo: depois?.minimo ?? s.minimo }, { headers: { "Cache-Control": "no-store" } });
}

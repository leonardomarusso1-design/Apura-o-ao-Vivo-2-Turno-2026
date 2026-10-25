import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { redis, redisPipeline } from "@/lib/redis";
import { limited } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/ip";
import { forbidden, readJson, sameOrigin } from "@/lib/security";
import { limpar } from "@/lib/leilao";
import { limparLink } from "@/lib/patro";
import { PIX_PAYLOAD, pixComValor } from "@/lib/pix";
import { BLOQUEADO, K_SLOT_ATUAL, K_SLOT_PEND, K_SLOT_PRECO, MAX_PEND, PRECO_INICIAL, type SlotAd, type SlotPend } from "@/lib/slot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function precoAtual(): Promise<number> {
  const raw = await redis<string>(["GET", K_SLOT_PRECO]);
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : PRECO_INICIAL;
}

/** Público: quem está no espaço agora e quanto custa tomá-lo. */
export async function GET() {
  const r = await redisPipeline([["GET", K_SLOT_ATUAL], ["GET", K_SLOT_PRECO]]);
  let atual: Pick<SlotAd, "marca" | "frase" | "site"> | null = null;
  try {
    const a = typeof r?.[0] === "string" ? (JSON.parse(r[0]) as SlotAd) : null;
    if (a) atual = { marca: a.marca, frase: a.frase, site: a.site };
  } catch {
    atual = null;
  }
  const p = Number(r?.[1]);
  const preco = Number.isFinite(p) && p > 0 ? Math.floor(p) : PRECO_INICIAL;
  return NextResponse.json({ atual, preco }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } });
}

type Corpo = { marca?: unknown; frase?: unknown; site?: unknown; contato?: unknown; website?: unknown; acao?: unknown; id?: unknown };
const erro = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const b = await readJson<Corpo>(req, 2000);
  if (!b || typeof b !== "object") return erro("Requisição inválida.");
  if (typeof b.website === "string" && b.website.length > 0) return NextResponse.json({ ok: true });
  const ipHash = hashIp(clientIp(req));

  // "Já paguei": só marca o pedido para você ver primeiro no painel. Quem libera é você, conferindo o banco.
  if (b.acao === "pago") {
    if (await limited(`slotpago:${ipHash}`, 10, 600)) return erro("Muitas tentativas.", 429);
    const id = typeof b.id === "string" && /^[a-f0-9]{16}$/.test(b.id) ? b.id : "";
    if (!id) return erro("Pedido inválido.");
    const raw = await redis<string>(["HGET", K_SLOT_PEND, id]);
    if (!raw) return erro("Pedido não encontrado.", 404);
    try {
      const p = JSON.parse(raw) as SlotPend;
      await redis(["HSET", K_SLOT_PEND, id, JSON.stringify({ ...p, pagou: true })]);
    } catch {
      return erro("Pedido inválido.");
    }
    return NextResponse.json({ ok: true });
  }

  if (await limited(`slot:${ipHash}`, 5, 600)) return erro("Muitas tentativas. Aguarde alguns minutos.", 429);
  if (!PIX_PAYLOAD) return erro("Pix indisponível no momento.", 503);

  const marca = limpar(b.marca, 40);
  const frase = limpar(b.frase, 80);
  const site = limparLink(b.site);
  const contato = limpar(b.contato, 80);
  if (marca.length < 2) return erro("Informe o nome da marca.");
  if (frase.length < 3) return erro("Escreva a frase do anúncio.");
  if (!site) return erro("Informe o site (https://...).");
  if (contato.length < 5) return erro("Informe e-mail ou WhatsApp para falarmos com você.");
  if (BLOQUEADO.test(`${marca} ${frase} ${site}`)) return erro("O espaço não aceita anúncios sobre eleição, candidatos ou partidos.");

  const len = Number(await redis<number>(["HLEN", K_SLOT_PEND]));
  if (Number.isFinite(len) && len >= MAX_PEND) return erro("Fila cheia. Tente mais tarde.", 503);

  const preco = await precoAtual();
  const pix = pixComValor(PIX_PAYLOAD, preco);
  if (!pix) return erro("Pix indisponível no momento.", 503);
  const id = randomBytes(8).toString("hex");
  const pend: SlotPend = { id, marca, frase, site, contato, preco, t: Date.now(), pagou: false };
  const ok = await redis(["HSET", K_SLOT_PEND, id, JSON.stringify(pend)]);
  if (ok === null) return erro("Não foi possível registrar agora.", 503);
  const qr = await QRCode.toDataURL(pix, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  return NextResponse.json({ ok: true, id, preco, pix, qr }, { headers: { "Cache-Control": "private, no-store" } });
}

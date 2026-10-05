import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { limited } from "@/lib/ratelimit";
import { forbidden, readJson, sameOrigin, assertProdConfig } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { clientIp, hashIp, newRefCode } from "@/lib/ip";
import {
  cleanName,
  cleanRef,
  cleanUtm,
  normalizeEmail,
  normalizePhoneBR,
} from "@/lib/validate";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  consent?: unknown;
  ref?: unknown;
  utm?: unknown;
  website?: unknown; // honeypot
  cfToken?: unknown;
};

export async function POST(req: Request) {
  assertProdConfig();
  if (!sameOrigin(req)) return forbidden();
  const body = await readJson<Body>(req);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  // Honeypot: bots preenchem; responde "ok" sem gravar
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  // 5/min por IP e 40/hora por IP (rede de celular compartilha IP, então o teto horário é folgado)
  if ((await limited(`sub:${ipHash}`, 5, 60)) || (await limited(`subh:${ipHash}`, 40, 3600))) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Aguarde um minuto." },
      { status: 429 },
    );
  }

  if (!(await verifyTurnstile(body.cfToken, ip))) {
    return NextResponse.json({ ok: false, error: "Verificação anti-robô falhou. Recarregue a página." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
  }

  let phone: string | null = null;
  if (typeof body.phone === "string" && body.phone.trim() !== "") {
    phone = normalizePhoneBR(body.phone);
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp inválido. Use DDD + número." },
        { status: 400 },
      );
    }
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { ok: false, error: "Você precisa autorizar o contato para continuar." },
      { status: 400 },
    );
  }

  const refCode = newRefCode();
  const { error } = await db()
    .from("subscribers")
    .insert({
      name: cleanName(body.name),
      email,
      phone,
      consent_at: new Date().toISOString(),
      consent_text: `${CONSENT_VERSION}: ${CONSENT_TEXT}`,
      ref_code: refCode,
      referred_by: cleanRef(body.ref),
      ip_hash: ipHash,
      utm_source: cleanUtm(body.utm),
    });

  if (error) {
    // 23505 = e-mail já cadastrado. Resposta idêntica para não vazar quem está na lista.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, refCode: null });
    }
    console.error("subscribe error", error.code, error.message);
    return NextResponse.json(
      { ok: false, error: "Não foi possível salvar agora. Tente de novo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, refCode });
}

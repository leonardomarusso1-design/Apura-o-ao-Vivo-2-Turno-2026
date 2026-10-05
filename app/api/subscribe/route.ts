import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { redis } from "@/lib/redis";
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
};

// Fallback em memória (por instância) quando não há Redis
const mem = new Map<string, { n: number; reset: number }>();

async function limited(key: string, max: number, windowSec: number): Promise<boolean> {
  const r = await redis<number>(["INCR", `rl:${key}`]);
  if (r !== null) {
    if (r === 1) await redis(["EXPIRE", `rl:${key}`, windowSec]);
    return r > max;
  }
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || cur.reset < now) {
    mem.set(key, { n: 1, reset: now + windowSec * 1000 });
    return false;
  }
  cur.n += 1;
  return cur.n > max;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida." }, { status: 400 });
  }

  // Honeypot: bots preenchem; responde "ok" sem gravar
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const ipHash = hashIp(clientIp(req));
  if (await limited(`sub:${ipHash}`, 5, 60)) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Aguarde um minuto." },
      { status: 429 },
    );
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

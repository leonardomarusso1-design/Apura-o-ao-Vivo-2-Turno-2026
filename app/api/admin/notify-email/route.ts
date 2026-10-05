import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/supabase";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";
import { emailContent, KINDS, type Kind } from "@/lib/notify/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Claimed = { notification_id: number; subscriber_id: string; name: string | null; email: string; unsub_token: string };

function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 24) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST { kind: "lembrete"|"inicio"|"resultado", limit?: number (<=200), dryRun?: boolean }
 * Reserva destinatários (sem duplicar), envia em lotes de 100 pelo Resend e marca o status.
 * Repita a chamada até `remaining` chegar a 0 (use scripts/notify.mjs).
 */
export async function POST(req: Request) {
  if (await limited(`admin:${hashIp(clientIp(req))}`, 30, 60)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { kind?: string; limit?: number; dryRun?: boolean } | null;
  const kind = body?.kind as Kind | undefined;
  if (!kind || !KINDS.includes(kind)) return NextResponse.json({ ok: false, error: "kind inválido" }, { status: 400 });
  const limit = Math.min(Math.max(Number(body?.limit ?? 100), 1), 200);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return NextResponse.json({ ok: false, error: "RESEND_API_KEY/EMAIL_FROM ausentes" }, { status: 500 });

  const supa = db();
  if (body?.dryRun) {
    const { data } = await supa.rpc("pending_count", { p_kind: kind, p_channel: "email" });
    return NextResponse.json({ ok: true, dryRun: true, remaining: Number(data ?? 0) });
  }

  const { data: claimed, error } = await supa.rpc("claim_notifications", { p_kind: kind, p_channel: "email", lim: limit });
  if (error) {
    console.error("claim", error.message);
    return NextResponse.json({ ok: false, error: "falha ao reservar" }, { status: 500 });
  }
  const rows = (claimed ?? []) as Claimed[];

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const payload = chunk.map((r) => {
      const c = emailContent(kind, { name: r.name, unsubToken: r.unsub_token });
      return {
        from,
        to: [r.email],
        subject: c.subject,
        html: c.html,
        text: c.text,
        headers: {
          "List-Unsubscribe": `<${c.unsubscribeUrl}>`,
        },
      };
    });

    let ok = false;
    let ids: (string | null)[] = [];
    let err = "";
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });
      const j = (await res.json().catch(() => ({}))) as { data?: { id: string }[]; message?: string };
      ok = res.ok;
      ids = (j.data ?? []).map((d) => d.id);
      if (!ok) err = (j.message ?? `HTTP ${res.status}`).slice(0, 200);
    } catch (e) {
      err = e instanceof Error ? e.message.slice(0, 200) : "erro";
    }

    const now = new Date().toISOString();
    await Promise.all(
      chunk.map((r, idx) =>
        supa
          .from("notifications")
          .update({ status: ok ? "sent" : "failed", provider_id: ids[idx] ?? null, error: ok ? null : err, updated_at: now })
          .eq("id", r.notification_id),
      ),
    );
    if (ok) sent += chunk.length;
    else failed += chunk.length;
    await new Promise((r) => setTimeout(r, 600)); // respeita o limite de requisições do Resend
  }

  const { data: rem } = await supa.rpc("pending_count", { p_kind: kind, p_channel: "email" });
  return NextResponse.json({ ok: true, sent, failed, remaining: Number(rem ?? 0) });
}

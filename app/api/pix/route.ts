import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { PIX_PAYLOAD } from "@/lib/pix";
import { clientIp, hashIp } from "@/lib/ip";
import { limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Entrega o Pix só quando alguém abre o modal ou clica em copiar. */
export async function GET(req: Request) {
  if (!PIX_PAYLOAD) return NextResponse.json({ ok: false }, { status: 404 });
  if (await limited(`pix:${hashIp(clientIp(req))}`, 20, 60)) return NextResponse.json({ ok: false }, { status: 429 });
  const qr = await QRCode.toDataURL(PIX_PAYLOAD, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  return NextResponse.json({ ok: true, pix: PIX_PAYLOAD, qr }, { headers: { "Cache-Control": "private, no-store" } });
}

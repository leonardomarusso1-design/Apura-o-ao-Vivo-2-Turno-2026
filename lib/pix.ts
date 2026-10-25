
/** Pix copia e cola. Fica só no servidor: não entra no HTML nem no bundle. Aceita NEXT_PUBLIC_ por compatibilidade. */
export const PIX_PAYLOAD = process.env.PIX_COPIA_COLA ?? process.env.NEXT_PUBLIC_PIX_COPIA_COLA ?? "";

function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Coloca o valor (campo 54) no Pix copia e cola e recalcula o CRC. Devolve null se o código-base não for um Pix válido. */
export function pixComValor(payload: string, valor: number): string | null {
  if (!(valor > 0)) return null;
  const campos: { id: string; v: string }[] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (!Number.isInteger(len) || i + 4 + len > payload.length) return null;
    campos.push({ id, v: payload.slice(i + 4, i + 4 + len) });
    i += 4 + len;
  }
  const sem = campos.filter((c) => c.id !== "54" && c.id !== "63");
  const pos = sem.findIndex((c) => c.id === "53");
  if (pos < 0) return null;
  sem.splice(pos + 1, 0, { id: "54", v: valor.toFixed(2) });
  const corpo = sem.map((c) => c.id + String(c.v.length).padStart(2, "0") + c.v).join("") + "6304";
  return corpo + crc16(corpo);
}


/** Pix copia e cola. Fica só no servidor: não entra no HTML nem no bundle. Aceita NEXT_PUBLIC_ por compatibilidade. */
export const PIX_PAYLOAD = process.env.PIX_COPIA_COLA ?? process.env.NEXT_PUBLIC_PIX_COPIA_COLA ?? "";

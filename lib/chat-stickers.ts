/** Figurinhas do chat: o servidor só aceita estes ids (nada de conteúdo livre), então não precisa moderar. */
export const STICKERS: { id: string; e: string; nome: string }[] = [
  { id: "fogo", e: "🔥", nome: "Fogo" },
  { id: "palmas", e: "👏", nome: "Palmas" },
  { id: "rindo", e: "🤣", nome: "Rindo" },
  { id: "pipoca", e: "🍿", nome: "Pipoca" },
  { id: "palhaco", e: "🤡", nome: "Palhaço" },
  { id: "choro", e: "😭", nome: "Choro" },
  { id: "susto", e: "😱", nome: "Susto" },
  { id: "mente", e: "🤯", nome: "Mente explodiu" },
  { id: "festa", e: "🥳", nome: "Festa" },
  { id: "bandeira", e: "🇧🇷", nome: "Brasil" },
  { id: "urna", e: "🗳️", nome: "Urna" },
  { id: "trofeu", e: "🏆", nome: "Troféu" },
  { id: "forca", e: "💪", nome: "Força" },
  { id: "reza", e: "🙏", nome: "Reza" },
  { id: "oculos", e: "😎", nome: "Cool" },
  { id: "pensando", e: "🤔", nome: "Pensando" },
  { id: "olhos", e: "👀", nome: "Olhando" },
  { id: "tempo", e: "⏳", nome: "Esperando" },
  { id: "foguete", e: "🚀", nome: "Foguete" },
  { id: "coracao", e: "❤️", nome: "Coração" },
  { id: "verde", e: "💚", nome: "Verde" },
  { id: "sirene", e: "🚨", nome: "Alerta" },
  { id: "gelo", e: "🥶", nome: "Gelado" },
  { id: "cranio", e: "💀", nome: "Morri" },
];
export const STICKER_RE = /^:s:([a-z]{2,12}):$/;
export const stickerDe = (m: string) => {
  const id = STICKER_RE.exec(m)?.[1];
  return id ? STICKERS.find((s) => s.id === id) ?? null : null;
};

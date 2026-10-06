/** Envia um evento ao Google Analytics/Tag Manager, se estiverem carregados. Sem eles, não faz nada. */
export function track(evento: string, params: Record<string, string | number> = {}): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
    if (typeof w.gtag === "function") w.gtag("event", evento, params);
    else if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: evento, ...params });
  } catch {
    /* analytics nunca pode quebrar a página */
  }
}

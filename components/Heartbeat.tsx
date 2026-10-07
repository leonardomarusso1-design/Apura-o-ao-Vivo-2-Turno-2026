"use client";

import { useEffect } from "react";

/** Envia um ping anônimo a cada 1 min (só com a aba visível) para o contador "online agora". Conta aparelhos únicos nos últimos ~3 min. */
export default function Heartbeat({ electionIso }: { electionIso: string }) {
  useEffect(() => {
    void electionIso; // o contador "online agora" funciona o tempo todo
    // Um id por aparelho/navegador (não por aba): abrir várias abas ou recarregar não conta como mais gente.
    let sid = "";
    try {
      sid = localStorage.getItem("apuracao:did") ?? "";
      if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem("apuracao:did", sid);
      }
    } catch {
      sid = crypto.randomUUID();
    }
    // Amostragem para o dia de pico: com NEXT_PUBLIC_PING_AMOSTRA=10, só 1 de cada 10 aparelhos pinga e o contador multiplica por 10.
    // O Redis aguenta 10 mil comandos/s; sem isso, ~600 mil pessoas online já o saturariam. Padrão 1 = todos (contagem exata).
    const amostra = Math.max(1, Math.floor(Number(process.env.NEXT_PUBLIC_PING_AMOSTRA) || 1));
    let h = 0;
    for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0;
    if (h % amostra !== 0) return;
    const ping = () => {
      if (document.hidden) return;
      void fetch("/api/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid }),
        keepalive: true,
      }).catch(() => undefined);
    };
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, [electionIso]);
  return null;
}

"use client";

import { useEffect } from "react";

/** Envia um ping anônimo a cada 60s (só com a aba visível) para o contador "online agora". */
export default function Heartbeat({ electionIso }: { electionIso: string }) {
  useEffect(() => {
    // Liga só a partir de 6h antes da votação encerrar (decidido no cliente: a página é estática)
    if (Date.now() < new Date(electionIso).getTime() - 6 * 3600_000) return;
    let sid = "";
    try {
      sid = sessionStorage.getItem("apuracao:sid") ?? "";
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem("apuracao:sid", sid);
      }
    } catch {
      sid = crypto.randomUUID();
    }
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

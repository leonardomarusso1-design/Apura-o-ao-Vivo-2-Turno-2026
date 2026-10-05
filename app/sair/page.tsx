"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function Inner() {
  const token = useSearchParams().get("t") ?? "";
  const [s, setS] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function go() {
    setS("loading");
    try {
      const r = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setS(r.ok ? "done" : "error");
    } catch {
      setS("error");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-3xl">Sair da lista</h1>
      {s === "done" ? (
        <p className="mt-4 text-mute">Pronto. Você não receberá mais avisos.</p>
      ) : (
        <>
          <p className="mt-4 text-mute">Confirme para parar de receber avisos da apuração.</p>
          <button
            onClick={go}
            disabled={!token || s === "loading"}
            className="mt-6 h-12 rounded-xl bg-paper px-6 font-semibold text-ink disabled:opacity-50"
          >
            {s === "loading" ? "Saindo…" : "Confirmar saída"}
          </button>
          {s === "error" ? <p className="mt-3 text-amber">Não foi possível. Link inválido?</p> : null}
        </>
      )}
    </main>
  );
}

export default function Sair() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

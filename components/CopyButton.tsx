"use client";

import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          /* ignore */
        }
      }}
      className="h-11 rounded-xl border border-line px-4 text-sm"
    >
      {ok ? "Copiado!" : label}
    </button>
  );
}

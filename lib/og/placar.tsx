import { ImageResponse } from "next/og";
import { getSnapshot } from "@/lib/apuracao/snapshot";
import { blocoDe, COR_BLOCO } from "@/lib/apuracao/blocos";
import { SITE_NAME } from "@/lib/env";

export const OG_SIZE = { width: 1200, height: 630 };

const pct = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (n: number) => n.toLocaleString("pt-BR");

/** Imagem de compartilhamento com o placar do momento (WhatsApp, X, Facebook). Cai para uma versão neutra se não houver dados. */
export async function imagemPlacar(turno: 1 | 2): Promise<ImageResponse> {
  const snap = await getSnapshot(turno).catch(() => null);
  const br = snap?.br ?? null;
  const dupla = br && br.pctApurado > 0 ? [...br.cands.slice(0, 2)].sort((a, b) => a.n - b.n) : [];
  const titulo = turno === 2 ? "2º turno 2026" : "1º turno 2026";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#07090e", color: "#f2f5f7", padding: 56 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 16, height: 16, borderRadius: 16, background: turno === 2 && br ? "#ef4444" : "#6b7785" }} />
            <span style={{ letterSpacing: 4, textTransform: "uppercase", color: "#9aa7b4" }}>{turno === 2 && br && snap?.status !== "finalizado" ? "Ao vivo" : "Resultado"}</span>
          </div>
          <span style={{ color: "#9aa7b4" }}>{titulo}</span>
        </div>

        {dupla.length === 2 && br ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 120, fontWeight: 700, lineHeight: 1 }}>{pct(br.pctApurado)}%</span>
              <span style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#9aa7b4" }}>das seções totalizadas</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
              {dupla.map((c, i) => (
                <div key={c.sq} style={{ display: "flex", flexDirection: "column", alignItems: i === 0 ? "flex-start" : "flex-end", flex: 1 }}>
                  <span style={{ fontSize: 34, textTransform: "uppercase", color: COR_BLOCO[blocoDe(c.partido)][0] }}>{c.nome}</span>
                  <span style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>{pct(c.pct)}%</span>
                  <span style={{ fontSize: 28, color: "#9aa7b4" }}>{int(c.votos)} votos</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>Apuração ao vivo do {turno}º turno</span>
            <span style={{ fontSize: 36, color: "#9aa7b4" }}>{turno === 2 ? "Domingo, 25 de outubro. Fim da votação às 17h (Brasília)." : "Resultado oficial do TSE, com mapa por estado e município."}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#9aa7b4" }}>
          <span>{SITE_NAME}</span>
          <span>Dados oficiais do TSE. Site independente.</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

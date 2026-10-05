// Organiza as fotos baixadas do TSE para public/candidatos/{sqcand}.jpg
// 1) Baixe o ZIP "Candidatos 2026 - BR - Fotos de candidatos" em https://dadosabertos.tse.jus.br/dataset/candidatos-2026
// 2) Descompacte numa pasta (ex.: C:\fotos_tse)
// 3) node scripts/fotos.mjs C:\fotos_tse
import { readdirSync, statSync, copyFileSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const origem = process.argv[2];
if (!origem) { console.error("Uso: node scripts/fotos.mjs <pasta-com-as-fotos>"); process.exit(1); }
const destino = join(process.cwd(), "public", "candidatos");
mkdirSync(destino, { recursive: true });

let n = 0;
const varre = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { varre(p); continue; }
    if (![".jpg", ".jpeg", ".png"].includes(extname(f).toLowerCase())) continue;
    const m = /(\d{9,})/.exec(f); // sqcand = sequência longa de dígitos no nome do arquivo
    if (!m) continue;
    copyFileSync(p, join(destino, `${m[1]}.jpg`));
    n++;
  }
};
varre(origem);
console.log(`${n} fotos copiadas para public/candidatos/`);

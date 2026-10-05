// Copia para public/candidatos/{sqcand}.jpg só as fotos que o site usa:
// governadores, senadores (todos os candidatos), deputados federais eleitos.
// Origem: os ZIPs foto_cand2026_UF_div.zip que já estão em public/candidatos.
// Uso (precisa de internet, só para ler a lista de candidatos no TSE):  node scripts/fotos-eleitos.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const DIR = join(process.cwd(), "public", "candidatos");
const BASE = "https://resultados.tse.jus.br/oficial/ele2026/6259/dados";
const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
mkdirSync(DIR, { recursive: true });

/** Leitor mínimo de ZIP (central directory + inflate), sem dependências. */
function abrirZip(caminho) {
  const buf = readFileSync(caminho);
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("zip inválido: " + caminho);
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const mapa = new Map();
  for (let i = 0; i < n; i++) {
    const metodo = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nome = buf.toString("utf8", p + 46, p + 46 + buf.readUInt16LE(p + 28));
    const off = buf.readUInt32LE(p + 42);
    const m = /(\d{9,})/.exec(nome);
    if (m) mapa.set(m[1], { metodo, csize, off });
    p += 46 + buf.readUInt16LE(p + 28) + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  const ler = (sq) => {
    const x = mapa.get(sq);
    if (!x) return null;
    const ini = x.off + 30 + buf.readUInt16LE(x.off + 26) + buf.readUInt16LE(x.off + 28);
    const dados = buf.subarray(ini, ini + x.csize);
    return x.metodo === 0 ? dados : inflateRawSync(dados);
  };
  return { mapa, ler };
}

/** Acha candidatos com votos (sqcand + vap) em qualquer ponto do JSON. */
function coleta(o, out, soEleitos) {
  if (Array.isArray(o)) return o.forEach((x) => coleta(x, out, soEleitos));
  if (!o || typeof o !== "object") return;
  if (o.sqcand && o.vap !== undefined && (!soEleitos || o.e === "s")) out.add(String(o.sqcand));
  for (const v of Object.values(o)) if (v && typeof v === "object") coleta(v, out, soEleitos);
}

async function lista(uf, cargo, soEleitos) {
  const l = uf.toLowerCase();
  const r = await fetch(`${BASE}/${l}/${l}-c000${cargo}-e006259-u.json`);
  if (!r.ok) { console.warn("sem dados:", uf, cargo, r.status); return []; }
  const s = new Set();
  coleta(await r.json(), s, soEleitos);
  return [...s];
}

let ok = 0, falta = 0;
for (const uf of UFS) {
  const zipPath = join(DIR, `foto_cand2026_${uf}_div.zip`);
  if (!existsSync(zipPath)) { console.warn("sem zip:", uf); continue; }
  const zip = abrirZip(zipPath);
  const sqs = new Set([...(await lista(uf, 3, false)), ...(await lista(uf, 5, false)), ...(await lista(uf, 6, true))]);
  for (const sq of sqs) {
    const dados = zip.ler(sq);
    if (!dados) { falta++; continue; }
    writeFileSync(join(DIR, `${sq}.jpg`), dados);
    ok++;
  }
  console.log(uf, "ok");
}
console.log(`${ok} fotos copiadas, ${falta} sem foto no ZIP.`);

// Gera public/geo/mun/{uf}.json (desenho dos municípios de cada estado) a partir das malhas do IBGE.
// Rode UMA vez, com internet:  node scripts/gen-municipios.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
const OUT = join(process.cwd(), "public", "geo", "mun");
mkdirSync(OUT, { recursive: true });
const W = 1000;

async function json(url) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {
      /* tenta de novo */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("falhou: " + url);
}

for (const uf of UFS) {
  const geo = await json(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf}?intrarregiao=municipio&formato=application/vnd.geo+json&qualidade=minima`);
  const nomes = await json(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
  const nome = new Map(nomes.map((m) => [String(m.id), m.nome]));

  const aneis = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates); // lista de polígonos (cada um: anéis)
  // Projeção NACIONAL única (todos os estados no mesmo sistema de coordenadas): permite o mapa de todos os municípios do Brasil
  const K = Math.cos((-14 * Math.PI) / 180);
  const SC = W / ((-34.7 - -74.1) * K);
  const X = (lon) => (lon + 74.1) * K * SC;
  const Y = (lat) => (5.4 - lat) * SC;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;

  const m = geo.features.map((f) => {
    let d = "";
    for (const poly of aneis(f.geometry)) for (const anel of poly) {
      let ult = "";
      const pts = [];
      for (const [lon, lat] of anel) {
        const px = X(lon), py = Y(lat);
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        const p = `${px.toFixed(1)} ${py.toFixed(1)}`;
        if (p !== ult) pts.push(p);
        ult = p;
      }
      if (pts.length >= 3) d += "M" + pts.join("L") + "Z";
    }
    const id = String(f.properties.codarea);
    return { i: id, n: nome.get(id) ?? "", d };
  });
  const vb = [x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4].map((v) => Math.round(v * 10) / 10);
  writeFileSync(join(OUT, `${uf.toLowerCase()}.json`), JSON.stringify({ vb, m }));
  console.log(uf, m.length, "municípios");
}
console.log("Pronto: public/geo/mun/*.json");

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
  let minLon = 1e9, maxLon = -1e9, minLat = 1e9, maxLat = -1e9;
  for (const f of geo.features) for (const poly of aneis(f.geometry)) for (const [lon, lat] of poly[0]) {
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const sc = W / ((maxLon - minLon) * k);
  const X = (lon) => (lon - minLon) * k * sc;
  const Y = (lat) => (maxLat - lat) * sc;
  const H = Math.ceil((maxLat - minLat) * sc);

  const m = geo.features.map((f) => {
    let d = "";
    for (const poly of aneis(f.geometry)) for (const anel of poly) {
      let ult = "";
      const pts = [];
      for (const [lon, lat] of anel) {
        const p = `${X(lon).toFixed(1)} ${Y(lat).toFixed(1)}`;
        if (p !== ult) pts.push(p);
        ult = p;
      }
      if (pts.length >= 3) d += "M" + pts.join("L") + "Z";
    }
    const id = String(f.properties.codarea);
    return { i: id, n: nome.get(id) ?? "", d };
  });
  writeFileSync(join(OUT, `${uf.toLowerCase()}.json`), JSON.stringify({ w: W, h: H, m }));
  console.log(uf, m.length, "municípios");
}
console.log("Pronto: public/geo/mun/*.json");

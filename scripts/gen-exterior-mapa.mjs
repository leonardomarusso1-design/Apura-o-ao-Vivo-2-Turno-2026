import { readFileSync, writeFileSync } from "node:fs";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
const W = 1000, H = 520;
const proj = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], { type: "Sphere" });
const gp = geoPath(proj).digits(1);
const rows = readFileSync("/home/claude/apuracao/scripts/ext-cidades.tsv", "utf8").trim().split("\n").map((l) => l.split("\t"));
const cidades = rows.map(([cd, nome, lat, lon, iso]) => {
  const [x, y] = proj([Number(lon), Number(lat)]);
  return { cd, nome, iso, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
});
const out = `// GERADO por scripts (não edite). Mapa: Natural Earth via world-atlas (domínio público).
export const WORLD_W = ${W};
export const WORLD_H = ${H};
export const WORLD_LAND = ${JSON.stringify(gp(land))};
export const WORLD_BORDERS = ${JSON.stringify(gp(borders))};
/** Coordenadas aproximadas (centro da cidade) já projetadas no mesmo mapa. A chave é o código do TSE. */
export const EXT_CIDADES: { cd: string; nome: string; iso: string; x: number; y: number }[] = ${JSON.stringify(cidades)};
`;
writeFileSync("/home/claude/apuracao/lib/exterior-mapa.ts", out);
console.log(out.length, cidades.length);

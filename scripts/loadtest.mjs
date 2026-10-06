// Teste de carga simples. Use SÓ no seu próprio site e aumente aos poucos.
// Uso:  node scripts/loadtest.mjs https://apuracaoaovivo2026.com.br/apuracao/2 [simultaneos=50] [segundos=30]
// Exemplo de rampa:  50 -> 150 -> 300. Pare se a taxa de erro passar de 1% ou o p95 passar de 2 s.
const [url, c = "50", s = "30"] = process.argv.slice(2);
if (!url || !/^https:\/\//.test(url)) {
  console.error("Informe uma URL https. Ex.: node scripts/loadtest.mjs https://seusite.com.br/apuracao/2 50 30");
  process.exit(1);
}
const conc = Math.min(Number(c) || 50, 500);
const fim = Date.now() + (Number(s) || 30) * 1000;
const tempos = [];
const status = {};
const cache = {};
let bytes = 0;

async function worker() {
  while (Date.now() < fim) {
    const t0 = performance.now();
    try {
      const r = await fetch(url, { headers: { "user-agent": "teste-de-carga-proprio" } });
      const buf = await r.arrayBuffer();
      bytes += buf.byteLength;
      status[r.status] = (status[r.status] ?? 0) + 1;
      const k = r.headers.get("x-vercel-cache") ?? "?";
      cache[k] = (cache[k] ?? 0) + 1;
    } catch {
      status.erro = (status.erro ?? 0) + 1;
    }
    tempos.push(performance.now() - t0);
  }
}

console.log(`Testando ${url} com ${conc} conexões por ${s}s...`);
const t0 = Date.now();
await Promise.all(Array.from({ length: conc }, worker));
const dur = (Date.now() - t0) / 1000;
tempos.sort((a, b) => a - b);
const p = (q) => Math.round(tempos[Math.min(tempos.length - 1, Math.floor(tempos.length * q))] ?? 0);
const total = tempos.length;
const ruins = total - (status[200] ?? 0);
console.log(`Requisições: ${total} (${(total / dur).toFixed(1)}/s) | MB baixados: ${(bytes / 1e6).toFixed(1)}`);
console.log(`Tempo (ms): p50 ${p(0.5)} | p95 ${p(0.95)} | p99 ${p(0.99)} | máx ${Math.round(tempos[total - 1] ?? 0)}`);
console.log("Status:", status);
console.log("Cache da Vercel:", cache, "(HIT é o esperado em páginas estáticas)");
console.log(`Fora de 200: ${ruins} (${((ruins / Math.max(1, total)) * 100).toFixed(2)}%)`);

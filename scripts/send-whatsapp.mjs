// Envia o aviso por WhatsApp (Z-API) com pausas aleatórias, para reduzir risco de bloqueio do número.
// Rode no seu PC (não na Vercel). Variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ZAPI_INSTANCE, ZAPI_TOKEN,
// ZAPI_CLIENT_TOKEN, SITE. Uso: node scripts/send-whatsapp.mjs <lembrete|inicio|resultado> [--max=300]
const kind = process.argv[2];
const max = Number((process.argv.find((a) => a.startsWith("--max=")) ?? "--max=300").split("=")[1]);
const E = process.env;
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ZAPI_INSTANCE", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN", "SITE"]) {
  if (!E[k]) { console.error(`Falta a variável ${k}`); process.exit(1); }
}
if (!["lembrete", "inicio", "resultado"].includes(kind)) { console.error("kind inválido"); process.exit(1); }

const CORPO = {
  lembrete: ["A apuração é amanhã", "As urnas fecham às 17h (Brasília). Guarde o link: a apuração acontece ao vivo, com mapa, projeção e atualizações."],
  inicio: ["A apuração começou", "Os primeiros resultados do 2º turno já estão sendo divulgados pelo TSE. Acompanhe ao vivo."],
  resultado: ["A apuração terminou", "O TSE concluiu a divulgação. Veja o resultado completo, estado por estado."],
};
const texto = (r) => {
  const nome = r.name ? r.name.split(" ")[0] : null;
  const [t, b] = CORPO[kind];
  return `${nome ? `Olá, ${nome}!` : "Olá!"} ${t}. ${b}\n\n${E.SITE}/apuracao?utm_source=whatsapp\n\nPara não receber mais avisos: ${E.SITE}/sair?t=${r.unsub_token}`;
};

const sb = (path, body) =>
  fetch(`${E.SUPABASE_URL}/rest/v1/${path}`, {
    method: path.startsWith("rpc/") ? "POST" : "PATCH",
    headers: { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

let enviados = 0;
while (enviados < max) {
  const res = await sb("rpc/claim_notifications", { p_kind: kind, p_channel: "whatsapp", lim: 20 });
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) break;
  for (const r of rows) {
    let ok = false, err = "", pid = null;
    try {
      const z = await fetch(`https://api.z-api.io/instances/${E.ZAPI_INSTANCE}/token/${E.ZAPI_TOKEN}/send-text`, {
        method: "POST",
        headers: { "Client-Token": E.ZAPI_CLIENT_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: r.phone, message: texto(r) }),
      });
      const j = await z.json().catch(() => ({}));
      ok = z.ok; pid = j.messageId ?? j.zaapId ?? null; if (!ok) err = JSON.stringify(j).slice(0, 200);
    } catch (e) { err = String(e).slice(0, 200); }
    await sb(`notifications?id=eq.${r.notification_id}`, { status: ok ? "sent" : "failed", provider_id: pid, error: ok ? null : err, updated_at: new Date().toISOString() });
    enviados++;
    console.log(`${enviados}/${max} ${ok ? "ok" : "FALHOU " + err}`);
    if (enviados >= max) break;
    await sleep(rand(6000, 16000)); // pausa humana entre mensagens
  }
}
console.log("Fim. Enviados nesta execução:", enviados);

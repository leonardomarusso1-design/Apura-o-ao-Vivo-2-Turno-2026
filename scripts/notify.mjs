// Dispara os e-mails em loop até acabar. Uso (no seu PC):
//   SITE=https://SEUDOMINIO ADMIN_SECRET=... node scripts/notify.mjs lembrete --dry
//   SITE=https://SEUDOMINIO ADMIN_SECRET=... node scripts/notify.mjs inicio
const [kind, flag] = process.argv.slice(2);
const SITE = process.env.SITE;
const SECRET = process.env.ADMIN_SECRET;
if (!kind || !SITE || !SECRET) {
  console.error("Uso: SITE=... ADMIN_SECRET=... node scripts/notify.mjs <lembrete|inicio|resultado> [--dry]");
  process.exit(1);
}
const call = async (body) => {
  const r = await fetch(`${SITE}/api/admin/notify-email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
if (flag === "--dry") {
  console.log(await call({ kind, dryRun: true }));
  process.exit(0);
}
let total = 0;
for (;;) {
  const { status, json } = await call({ kind, limit: 200 });
  if (status !== 200 || !json.ok) { console.error("Erro", status, json); process.exit(1); }
  total += json.sent;
  console.log(`enviados +${json.sent} | falhas +${json.failed} | restam ${json.remaining} | total ${total}`);
  if (json.remaining === 0 || (json.sent === 0 && json.failed === 0)) break;
}
console.log("Concluído.");

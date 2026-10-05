/** Marca este navegador como "já inscrito": o middleware leva direto para /apuracao nas próximas visitas. */
export function marcarInscrito(): void {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `apr_ok=1; Max-Age=${60 * 60 * 24 * 120}; Path=/; SameSite=Lax${secure}`;
  } catch {
    /* cookies bloqueados: segue funcionando sem o atalho */
  }
}

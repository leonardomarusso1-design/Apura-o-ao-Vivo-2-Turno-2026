import { redirect } from "next/navigation";
import { getSnapshot } from "@/lib/apuracao/snapshot";

export const dynamic = "force-dynamic";

/** /apuracao leva para o 2º turno assim que ele tiver dados; até lá, mostra o resultado do 1º turno. */
export default async function Page() {
  const s = await getSnapshot(2).catch(() => null);
  redirect(s && s.status !== "aguardando" ? "/apuracao/2" : "/apuracao/1");
}

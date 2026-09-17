import { cookies } from "next/headers";
import { verifySession } from "../../lib/session";
import Kabuk from "../../components/Kabuk";
import YoklamaIstemci from "./YoklamaIstemci";

export default async function YoklamaSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  return (
    <Kabuk aktif="/duz-yoklama">
      <YoklamaIstemci isAdmin={!!session?.admin} />
    </Kabuk>
  );
}

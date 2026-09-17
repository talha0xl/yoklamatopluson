import { cookies } from "next/headers";
import { verifySession } from "../../lib/session";
import Kabuk from "../../components/Kabuk";
import GorevIstemci from "./GorevIstemci";

export default async function GorevListeleriSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  return (
    <Kabuk aktif="/gorev-listeleri">
      <GorevIstemci isAdmin={!!session?.admin} />
    </Kabuk>
  );
}

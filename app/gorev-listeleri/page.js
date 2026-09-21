import { cookies } from "next/headers";
import { verifySession } from "../../lib/session";
import { supabaseServer } from "../../lib/supabaseServer";
import Kabuk from "../../components/Kabuk";
import GorevIstemci from "./GorevIstemci";

export default async function GorevListeleriSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  const supabase = supabaseServer();
  const { data: listeler } = await supabase.from("gorev_listeleri").select("*").order("siralama");

  return (
    <Kabuk aktif="/gorev-listeleri">
      <GorevIstemci isAdmin={!!session?.admin} baslangicListeler={listeler || []} />
    </Kabuk>
  );
}

import { supabaseServer } from "../../lib/supabaseServer";
import Kabuk from "../../components/Kabuk";
import IstatistikIstemci from "./IstatistikIstemci";

export const dynamic = "force-dynamic";

export default async function IstatistikSayfasi() {
  const supabase = supabaseServer();
  const [{ data: gruplar }, { data: turler }] = await Promise.all([
    supabase.from("gruplar").select("*").order("siralama"),
    supabase.from("yoklama_turleri").select("*").eq("aktif", true).order("siralama"),
  ]);

  return (
    <Kabuk aktif="/istatistik">
      <IstatistikIstemci baslangicGruplar={gruplar || []} baslangicTurler={turler || []} />
    </Kabuk>
  );
}

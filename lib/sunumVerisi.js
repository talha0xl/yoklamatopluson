import { supabaseServer } from "./supabaseServer";
import { sirdakiOge, bugunISO } from "./rotasyon";
import { modulErisimVarMi } from "./moduller";

// Sunum Modu ve normal ana sayfa "bugünün vazifeleri" kısmının ortak
// mantığı: bugün hangi kişi/grup görevli, rotasyon sırasına göre hesaplar.
async function tekVazifeGetir(supabase, liste, tarih) {
  const [{ data: kisiler }, { data: gruplar }] = await Promise.all([
    supabase.from("gorev_kisileri").select("*").eq("aktif", true).eq("liste_id", liste.id).order("sira"),
    supabase.from("gorev_gruplari").select("*").eq("liste_id", liste.id).order("siralama"),
  ]);
  const birimler =
    gruplar && gruplar.length
      ? gruplar.map((g) => ({ isim: g.isim }))
      : (kisiler || []).map((k) => ({ isim: k.ad_soyad }));
  if (!birimler.length) return null;
  const bugunVazifeli = sirdakiOge(birimler, liste.rotasyon_baslangic, tarih);
  return bugunVazifeli ? { liste: liste.isim, kisi: bugunVazifeli.isim } : null;
}

async function vazifelerGetir(supabase, tarih) {
  const { data: listeler } = await supabase.from("gorev_listeleri").select("*").eq("rotasyonlu", true).order("siralama");
  const sonuclar = await Promise.all((listeler || []).map((liste) => tekVazifeGetir(supabase, liste, tarih)));
  return sonuclar.filter(Boolean);
}

// Sunum Modu için: bugünün toplam öğrenci/yoklama/namaz/vazife özeti,
// tüm gruplar birleştirilmiş halde (tek bir grup değil, genel toplam).
export async function sunumVerisiGetir(session) {
  const supabase = supabaseServer();
  const tarih = bugunISO();

  const { data: aktifOgrenciler, count: toplamOgrenci } = await supabase
    .from("ogrenciler")
    .select("id", { count: "exact" })
    .eq("aktif", true);
  const aktifIdler = (aktifOgrenciler || []).map((o) => o.id);

  let yoklama = null;
  if (modulErisimVarMi(session, "duz_yoklama") && aktifIdler.length) {
    const { data: kayitlar } = await supabase.from("yoklama").select("durum").eq("tarih", tarih).in("ogrenci_id", aktifIdler);
    const liste = kayitlar || [];
    yoklama = {
      geldi: liste.filter((k) => k.durum === "geldi").length,
      izinli: liste.filter((k) => k.durum === "izinli").length,
      izinsiz: liste.filter((k) => k.durum === "izinsiz").length,
      toplamIsaretlenen: liste.length,
    };
  }

  let namaz = null;
  if (modulErisimVarMi(session, "namaz_yoklama") && aktifIdler.length) {
    const { data: kayitlar } = await supabase.from("namaz_yoklama").select("durum").eq("tarih", tarih).in("ogrenci_id", aktifIdler);
    const liste = kayitlar || [];
    namaz = {
      kildi: liste.filter((k) => k.durum === "kildi").length,
      gecKildi: liste.filter((k) => k.durum === "gec_kildi").length,
      izinli: liste.filter((k) => k.durum === "izinli").length,
      kilmadi: liste.filter((k) => k.durum === "kilmadi").length,
      toplamIsaretlenen: liste.length,
    };
  }

  const vazifeler = modulErisimVarMi(session, "gorev_listeleri") ? await vazifelerGetir(supabase, tarih).catch(() => []) : [];

  return {
    tarih,
    toplamOgrenci: toplamOgrenci || 0,
    yoklama,
    namaz,
    vazifeler,
  };
}

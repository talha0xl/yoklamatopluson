import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/istatistik?kaynak=yoklama&grup_id=...&tur_id=...&baslangic=...&bitis=...
// GET /api/istatistik?kaynak=namaz&grup_id=...&baslangic=...&bitis=...
export async function GET(req) {
  const kaynak = req.nextUrl.searchParams.get("kaynak") || "yoklama";
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const baslangic = req.nextUrl.searchParams.get("baslangic");
  const bitis = req.nextUrl.searchParams.get("bitis");
  const supabase = supabaseServer();

  let ogrenciQ = supabase.from("ogrenciler").select("*").eq("aktif", true).order("ad_soyad");
  if (grupId) ogrenciQ = ogrenciQ.eq("grup_id", grupId);
  const { data: ogrenciler, error: e1 } = await ogrenciQ;
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const ids = ogrenciler.map((o) => o.id);

  if (kaynak === "namaz") {
    let kayitlar = [];
    if (ids.length) {
      let q = supabase.from("namaz_yoklama").select("*").in("ogrenci_id", ids);
      if (baslangic) q = q.gte("tarih", baslangic);
      if (bitis) q = q.lte("tarih", bitis);
      const { data, error: e2 } = await q;
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      kayitlar = data;
    }
    const sonuc = ogrenciler.map((o) => {
      const kOgr = kayitlar.filter((k) => k.ogrenci_id === o.id);
      const kildi = kOgr.filter((k) => k.durum === "kildi").length;
      const gecKildi = kOgr.filter((k) => k.durum === "gec_kildi").length;
      const kilmadi = kOgr.filter((k) => k.durum === "kilmadi").length;
      const toplam = kOgr.length;
      return {
        ogrenci: o,
        geldi: kildi, // ortak arayüz için aynı alan adları kullanılıyor
        izinli: gecKildi, // "geç kıldı"
        izinsiz: kilmadi,
        toplam,
        oran: toplam ? Math.round(((kildi + gecKildi) / toplam) * 100) : null,
      };
    });
    return NextResponse.json({ sonuc });
  }

  // kaynak === "yoklama" (varsayılan)
  const turId = req.nextUrl.searchParams.get("tur_id");
  let kayitlar = [];
  if (ids.length && turId) {
    let q = supabase.from("yoklama").select("*").in("ogrenci_id", ids).eq("tur_id", turId);
    if (baslangic) q = q.gte("tarih", baslangic);
    if (bitis) q = q.lte("tarih", bitis);
    const { data, error: e2 } = await q;
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    kayitlar = data;
  }

  const sonuc = ogrenciler.map((o) => {
    const kOgr = kayitlar.filter((k) => k.ogrenci_id === o.id);
    const geldi = kOgr.filter((k) => k.durum === "geldi").length;
    const izinli = kOgr.filter((k) => k.durum === "izinli").length;
    const izinsiz = kOgr.filter((k) => k.durum === "izinsiz").length;
    const toplam = kOgr.length;
    return {
      ogrenci: o,
      geldi,
      izinli,
      izinsiz,
      toplam,
      oran: toplam ? Math.round((geldi / toplam) * 100) : null,
    };
  });

  return NextResponse.json({ sonuc });
}

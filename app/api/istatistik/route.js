import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { sirdakiOge, tarihEkle } from "../../../lib/rotasyon";

// GET /api/istatistik?kaynak=yoklama&grup_id=...&tur_id=...&baslangic=...&bitis=...
// GET /api/istatistik?kaynak=namaz&grup_id=...&baslangic=...&bitis=...
// GET /api/istatistik?kaynak=gorev&liste_id=...&baslangic=...&bitis=...
export async function GET(req) {
  const kaynak = req.nextUrl.searchParams.get("kaynak") || "yoklama";
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const baslangic = req.nextUrl.searchParams.get("baslangic");
  const bitis = req.nextUrl.searchParams.get("bitis");
  const supabase = supabaseServer();

  if (kaynak === "gorev") {
    // Görev Listeleri artık günlük işaretleme değil, otomatik sıra (rotasyon)
    // ile çalışıyor. Burada "kim kaç gün vazifeliydi" sorusunu, geçmişe dönük
    // olarak, aynı sıralama formülünü tarih tarih tekrar hesaplayarak
    // cevaplıyoruz — ayrıca kayıt tutmaya gerek yok.
    const listeId = req.nextUrl.searchParams.get("liste_id");
    const { data: liste, error: elis } = await supabase.from("gorev_listeleri").select("*").eq("id", listeId).maybeSingle();
    if (elis) return NextResponse.json({ error: elis.message }, { status: 500 });

    const [{ data: kisiler, error: ek1 }, { data: gruplar, error: eg1 }] = await Promise.all([
      supabase.from("gorev_kisileri").select("*").eq("aktif", true).eq("liste_id", listeId).order("sira"),
      supabase.from("gorev_gruplari").select("*").eq("liste_id", listeId).order("siralama"),
    ]);
    if (ek1) return NextResponse.json({ error: ek1.message }, { status: 500 });
    if (eg1) return NextResponse.json({ error: eg1.message }, { status: 500 });

    const kisiSayaclari = {};
    (kisiler || []).forEach((k) => (kisiSayaclari[k.id] = 0));
    let toplamGun = 0;

    if (liste?.rotasyonlu && (kisiler || []).length && baslangic && bitis) {
      const birimler =
        gruplar && gruplar.length
          ? gruplar.map((g) => ({ id: g.id, uyeler: (kisiler || []).filter((k) => k.grup_id === g.id) }))
          : (kisiler || []).map((k) => ({ id: k.id, uyeler: [k] }));

      let gun = baslangic;
      let donguSayaci = 0;
      while (gun <= bitis && donguSayaci < 400) {
        const birim = sirdakiOge(birimler, liste.rotasyon_baslangic, gun);
        if (birim) birim.uyeler.forEach((k) => (kisiSayaclari[k.id] = (kisiSayaclari[k.id] || 0) + 1));
        toplamGun++;
        gun = tarihEkle(gun, 1);
        donguSayaci++;
      }
    }

    const sonuc = (kisiler || []).map((k) => {
      const gunSayisi = kisiSayaclari[k.id] || 0;
      return {
        ogrenci: k, // ortak arayüz için aynı alan adı kullanılıyor
        geldi: gunSayisi,
        izinli: 0,
        izinsiz: 0,
        toplam: toplamGun,
        basari: gunSayisi,
        payda: toplamGun,
        oran: toplamGun ? Math.round((gunSayisi / toplamGun) * 100) : null,
      };
    });
    return NextResponse.json({ sonuc });
  }

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
      const izinli = kOgr.filter((k) => k.durum === "izinli").length;
      const kilmadi = kOgr.filter((k) => k.durum === "kilmadi").length;
      // İzinli olunan vakitler oranı düşürmesin diye paydadan çıkarılıyor.
      const paydaGun = kOgr.length - izinli;
      return {
        ogrenci: o,
        geldi: kildi,
        gecKildi,
        izinli,
        izinsiz: kilmadi,
        toplam: kOgr.length,
        basari: kildi + gecKildi,
        payda: paydaGun,
        oran: paydaGun > 0 ? Math.round(((kildi + gecKildi) / paydaGun) * 100) : null,
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
      basari: geldi,
      payda: toplam,
      oran: toplam ? Math.round((geldi / toplam) * 100) : null,
    };
  });

  return NextResponse.json({ sonuc });
}

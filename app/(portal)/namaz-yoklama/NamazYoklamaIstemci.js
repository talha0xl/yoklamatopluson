"use client";
import { useEffect, useState, useCallback } from "react";
import { useAraliklaTazele } from "../../../lib/useAraliklaTazele";

const VAKITLER = [
  { anahtar: "sabah", etiket: "Sabah" },
  { anahtar: "ogle", etiket: "Öğle" },
  { anahtar: "ikindi", etiket: "İkindi" },
  { anahtar: "aksam", etiket: "Akşam" },
  { anahtar: "yatsi", etiket: "Yatsı" },
];

// Durum etiketleri: kildi/gec_kildi/kilmadi/izinli veritabanı değerleri
// aynı kaldı (geriye dönük uyumlu), sadece ekrandaki yazılar değişti.
const DURUM_ETIKET = { kildi: "Geldi", gec_kildi: "Geç Geldi", izinli: "İzinli", kilmadi: "Gelmedi" };

function suankiVakit() {
  const saat = new Date().getHours();
  if (saat < 9) return "sabah";
  if (saat < 14) return "ogle";
  if (saat < 17) return "ikindi";
  if (saat < 19) return "aksam";
  return "yatsi";
}

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function NamazYoklamaIstemci({ baslangicGruplar }) {
  const [gruplar] = useState(baslangicGruplar || []);
  const [grupId, setGrupId] = useState(baslangicGruplar?.[0]?.id || null);
  const [vakit, setVakit] = useState(suankiVakit());
  const [tarih, setTarih] = useState(bugun());
  const [ogrenciler, setOgrenciler] = useState([]);
  // key: `${ogrenci_id}:${vakit}` -> kayit
  const [kayitMap, setKayitMap] = useState({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sebepAcikAnahtar, setSebepAcikAnahtar] = useState(null);
  const [sebepTaslak, setSebepTaslak] = useState("");
  const [kayitHata, setKayitHata] = useState("");

  const tazele = useCallback(
    (sessiz) => {
      if (!grupId || !tarih) return;
      if (!sessiz) setYukleniyor(true);
      fetch(`/api/namaz-yoklama?grup_id=${grupId}&tarih=${tarih}`)
        .then((r) => r.json())
        .then((d) => {
          setOgrenciler(d.ogrenciler || []);
          const map = {};
          (d.kayitlar || []).forEach((k) => (map[`${k.ogrenci_id}:${k.vakit}`] = k));
          setKayitMap(map);
          if (!sessiz) setYukleniyor(false);
        });
    },
    [grupId, tarih]
  );

  useEffect(() => tazele(false), [tazele]);
  // Sekme açıkken arka planda birkaç saniyede bir sessizce tazeler, böylece
  // başka bir hocanın az önce işaretlediği bir kayıt da kısa sürede görünür.
  useAraliklaTazele(() => tazele(true));

  // İyimser (optimistic) güncelleme: sunucudan cevap beklemeden ekranı hemen
  // günceller, böylece dokunuş anında tepki veriyormuş gibi hissettirir.
  // Cevap gelince gerçek kayıtla (id, updated_at) senkronlanır; hata olursa
  // önceki hale geri döner.
  async function isaretle(ogrenciId, durum, notMetni) {
    const anahtar = `${ogrenciId}:${vakit}`;
    const oncekiKayit = kayitMap[anahtar];
    const notDegeri = durum === "izinli" ? (notMetni ?? oncekiKayit?.not_metni ?? null) : null;

    setKayitMap((m) => ({
      ...m,
      [anahtar]: { ...(m[anahtar] || {}), ogrenci_id: ogrenciId, tarih, vakit, durum, not_metni: notDegeri },
    }));

    try {
      const res = await fetch("/api/namaz-yoklama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ogrenci_id: ogrenciId, tarih, vakit, durum, not_metni: notDegeri }),
      });
      const d = await res.json();
      if (d.kayit) setKayitMap((m) => ({ ...m, [anahtar]: d.kayit }));
      else throw new Error(d.error || "kayıt hatası");
    } catch (err) {
      // Sunucu hata verdiyse eski haline geri al ve neden olduğunu göster
      // (aksi halde buton sessizce eski haline dönüyor, kafa karıştırıyor)
      setKayitMap((m) => {
        const yeni = { ...m };
        if (oncekiKayit) yeni[anahtar] = oncekiKayit;
        else delete yeni[anahtar];
        return yeni;
      });
      setKayitHata(
        `Kaydedilemedi, işaretiniz geri alındı (${err.message}). Supabase'de v7/v9 SQL güncellemesi çalıştırılmamış olabilir.`
      );
      setTimeout(() => setKayitHata(""), 8000);
    }
  }

  async function isaretiSil(ogrenciId) {
    const anahtar = `${ogrenciId}:${vakit}`;
    setKayitMap((m) => {
      const yeni = { ...m };
      delete yeni[anahtar];
      return yeni;
    });
    if (sebepAcikAnahtar === anahtar) setSebepAcikAnahtar(null);
    await fetch(`/api/namaz-yoklama?ogrenci_id=${ogrenciId}&tarih=${tarih}&vakit=${vakit}`, { method: "DELETE" });
  }

  function izinliTiklandi(ogrenciId) {
    const anahtar = `${ogrenciId}:${vakit}`;
    isaretle(ogrenciId, "izinli");
    setSebepAcikAnahtar(anahtar);
    setSebepTaslak(kayitMap[anahtar]?.not_metni || "");
  }

  function sebepKaydet(ogrenciId) {
    isaretle(ogrenciId, "izinli", sebepTaslak.trim() || null);
    setSebepAcikAnahtar(null);
  }

  const kildiSayisi = ogrenciler.filter((o) => kayitMap[`${o.id}:${vakit}`]?.durum === "kildi").length;
  const gecKildiSayisi = ogrenciler.filter((o) => kayitMap[`${o.id}:${vakit}`]?.durum === "gec_kildi").length;
  const izinliSayisi = ogrenciler.filter((o) => kayitMap[`${o.id}:${vakit}`]?.durum === "izinli").length;
  const kilmadiSayisi = ogrenciler.filter((o) => kayitMap[`${o.id}:${vakit}`]?.durum === "kilmadi").length;
  const isaretsizSayisi = ogrenciler.length - kildiSayisi - gecKildiSayisi - izinliSayisi - kilmadiSayisi;

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Namaz Yoklama</h1>
        <input
          type="date"
          className="girdi"
          style={{ width: 170 }}
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
          max={bugun()}
        />
      </div>
      <p className="sayfa-alt">Önce vakti seçin, sonra isme göre Geldi / Geç Geldi / İzinli / Gelmedi'ye tek dokunuşla işaretleyin.</p>

      {kayitHata && <div className="hata" style={{ marginBottom: 16 }}>{kayitHata}</div>}

      <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Vakit</label>
      <div className="grup-sekme">
        {VAKITLER.map((v) => (
          <button key={v.anahtar} className={vakit === v.anahtar ? "aktif" : ""} onClick={() => setVakit(v.anahtar)}>
            {v.etiket}
          </button>
        ))}
      </div>

      <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Grup</label>
      <div className="grup-sekme">
        {gruplar.map((g) => (
          <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
            {g.isim}
          </button>
        ))}
      </div>

      {!yukleniyor && ogrenciler.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <span className="rozet rozet-yesil">{kildiSayisi} geldi</span>
          <span className="rozet rozet-amber">{gecKildiSayisi} geç geldi</span>
          <span className="rozet rozet-mavi">{izinliSayisi} izinli</span>
          <span className="rozet rozet-kirmizi">{kilmadiSayisi} gelmedi</span>
          <span className="rozet rozet-gri">{isaretsizSayisi} işaretsiz</span>
        </div>
      )}

      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && ogrenciler.length === 0 && (
            <div className="bos-durum">Bu grupta kayıtlı öğrenci yok. Yönetim sayfasından öğrenci ekleyin.</div>
          )}
          {!yukleniyor &&
            ogrenciler.map((o) => {
              const anahtar = `${o.id}:${vakit}`;
              const kayit = kayitMap[anahtar];
              const durum = kayit?.durum;
              const sebepAcik = sebepAcikAnahtar === anahtar;
              return (
                <div key={o.id}>
                  <div className="ogrenci-satir" style={sebepAcik || (durum === "izinli" && kayit?.not_metni) ? { borderBottom: "none" } : undefined}>
                    <div>
                      <div className="ogrenci-ad">{o.ad_soyad}</div>
                      <div className="ogrenci-detay">
                        {durum ? <>{DURUM_ETIKET[durum]} olarak işaretlendi</> : <>Henüz işaretlenmedi</>}
                      </div>
                    </div>

                    <div className="durum-btn-grup">
                      <button
                        className={`durum-btn ${durum === "kildi" ? "secili-geldi" : ""}`}
                        onClick={() => isaretle(o.id, "kildi")}
                      >
                        Geldi
                      </button>
                      <button
                        className={`durum-btn ${durum === "gec_kildi" ? "secili-izinli" : ""}`}
                        onClick={() => isaretle(o.id, "gec_kildi")}
                      >
                        Geç Geldi
                      </button>
                      <button
                        className={`durum-btn ${durum === "izinli" ? "secili-mavi" : ""}`}
                        onClick={() => izinliTiklandi(o.id)}
                      >
                        İzinli
                      </button>
                      <button
                        className={`durum-btn ${durum === "kilmadi" ? "secili-izinsiz" : ""}`}
                        onClick={() => isaretle(o.id, "kilmadi")}
                      >
                        Gelmedi
                      </button>
                      {durum && (
                        <button className="btn btn-hayalet btn-sm" title="İşareti sil" onClick={() => isaretiSil(o.id)}>
                          Sıfırla
                        </button>
                      )}
                    </div>
                  </div>

                  {sebepAcik && (
                    <div className="sebep-alani">
                      <input
                        className="girdi"
                        autoFocus
                        placeholder="İzin sebebi (isteğe bağlı) — örn. Ailesinin yanında"
                        value={sebepTaslak}
                        onChange={(e) => setSebepTaslak(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sebepKaydet(o.id)}
                      />
                      <button className="btn btn-lacivert btn-sm" onClick={() => sebepKaydet(o.id)}>
                        Kaydet
                      </button>
                      <button className="btn btn-hayalet btn-sm" onClick={() => setSebepAcikAnahtar(null)}>
                        Kapat
                      </button>
                    </div>
                  )}
                  {!sebepAcik && durum === "izinli" && kayit?.not_metni && (
                    <div className="sebep-alani sebep-goruntu">
                      <span>Sebep: {kayit.not_metni}</span>
                      <button
                        className="btn btn-hayalet btn-sm"
                        onClick={() => {
                          setSebepAcikAnahtar(anahtar);
                          setSebepTaslak(kayit.not_metni || "");
                        }}
                      >
                        Düzenle
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}

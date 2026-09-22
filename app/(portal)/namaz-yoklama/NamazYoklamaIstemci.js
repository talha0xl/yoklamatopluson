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
  const [kaydedenId, setKaydedenId] = useState(null);

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

  async function isaretle(ogrenciId, durum) {
    setKaydedenId(ogrenciId);
    const res = await fetch("/api/namaz-yoklama", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ogrenci_id: ogrenciId, tarih, vakit, durum }),
    });
    const d = await res.json();
    if (d.kayit) setKayitMap((m) => ({ ...m, [`${ogrenciId}:${vakit}`]: d.kayit }));
    setKaydedenId(null);
  }

  async function isaretiSil(ogrenciId) {
    setKaydedenId(ogrenciId);
    await fetch(`/api/namaz-yoklama?ogrenci_id=${ogrenciId}&tarih=${tarih}&vakit=${vakit}`, { method: "DELETE" });
    setKayitMap((m) => {
      const yeni = { ...m };
      delete yeni[`${ogrenciId}:${vakit}`];
      return yeni;
    });
    setKaydedenId(null);
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
      <p className="sayfa-alt">Önce vakti seçin, sonra isme göre Kıldı / Geç Kıldı / İzinli / Kılmadı'ya tek dokunuşla işaretleyin.</p>

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
          <span className="rozet rozet-yesil">{kildiSayisi} kıldı</span>
          <span className="rozet rozet-amber">{gecKildiSayisi} geç kıldı</span>
          <span className="rozet rozet-mavi">{izinliSayisi} izinli</span>
          <span className="rozet rozet-kirmizi">{kilmadiSayisi} kılmadı</span>
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
              return (
                <div className="ogrenci-satir" key={o.id}>
                  <div>
                    <div className="ogrenci-ad">{o.ad_soyad}</div>
                    <div className="ogrenci-detay">
                      {durum === "kildi" && <>Kıldı olarak işaretlendi</>}
                      {durum === "gec_kildi" && <>Geç kıldı olarak işaretlendi</>}
                      {durum === "izinli" && <>İzinli olarak işaretlendi</>}
                      {durum === "kilmadi" && <>Kılmadı olarak işaretlendi</>}
                      {!durum && <>Henüz işaretlenmedi</>}
                    </div>
                  </div>

                  <div className="durum-btn-grup">
                    <button
                      className={`durum-btn ${durum === "kildi" ? "secili-geldi" : ""}`}
                      disabled={kaydedenId === o.id}
                      onClick={() => isaretle(o.id, "kildi")}
                    >
                      Kıldı
                    </button>
                    <button
                      className={`durum-btn ${durum === "gec_kildi" ? "secili-izinli" : ""}`}
                      disabled={kaydedenId === o.id}
                      onClick={() => isaretle(o.id, "gec_kildi")}
                    >
                      Geç Kıldı
                    </button>
                    <button
                      className={`durum-btn ${durum === "izinli" ? "secili-mavi" : ""}`}
                      disabled={kaydedenId === o.id}
                      onClick={() => isaretle(o.id, "izinli")}
                    >
                      İzinli
                    </button>
                    <button
                      className={`durum-btn ${durum === "kilmadi" ? "secili-izinsiz" : ""}`}
                      disabled={kaydedenId === o.id}
                      onClick={() => isaretle(o.id, "kilmadi")}
                    >
                      Kılmadı
                    </button>
                    {durum && (
                      <button
                        className="btn btn-hayalet btn-sm"
                        title="İşareti sil"
                        disabled={kaydedenId === o.id}
                        onClick={() => isaretiSil(o.id)}
                      >
                        Sıfırla
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";

const VAKITLER = [
  { anahtar: "sabah", etiket: "Sabah" },
  { anahtar: "ogle", etiket: "Öğle" },
  { anahtar: "ikindi", etiket: "İkindi" },
  { anahtar: "aksam", etiket: "Akşam" },
  { anahtar: "yatsi", etiket: "Yatsı" },
];

// Bir hücreye tıklandıkça sırayla döner: boş -> Kıldı -> Geç Kıldı -> Kılmadı -> boş
const DURUM_SIRASI = [null, "kildi", "gec_kildi", "kilmadi"];
const DURUM_ETIKET = { kildi: "Kıldı", gec_kildi: "Geç Kıldı", kilmadi: "Kılmadı" };
const DURUM_SINIF = { kildi: "secili-geldi", gec_kildi: "secili-izinli", kilmadi: "secili-izinsiz" };

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function NamazYoklamaIstemci({ baslangicGruplar }) {
  const [gruplar] = useState(baslangicGruplar || []);
  const [grupId, setGrupId] = useState(baslangicGruplar?.[0]?.id || null);
  const [tarih, setTarih] = useState(bugun());
  const [ogrenciler, setOgrenciler] = useState([]);
  // key: `${ogrenci_id}:${vakit}` -> kayit
  const [kayitMap, setKayitMap] = useState({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydedenAnahtar, setKaydedenAnahtar] = useState(null);

  const veriGetir = useCallback(() => {
    if (!grupId || !tarih) return;
    setYukleniyor(true);
    fetch(`/api/namaz-yoklama?grup_id=${grupId}&tarih=${tarih}`)
      .then((r) => r.json())
      .then((d) => {
        setOgrenciler(d.ogrenciler || []);
        const map = {};
        (d.kayitlar || []).forEach((k) => (map[`${k.ogrenci_id}:${k.vakit}`] = k));
        setKayitMap(map);
        setYukleniyor(false);
      });
  }, [grupId, tarih]);

  useEffect(() => veriGetir(), [veriGetir]);

  async function tikla(ogrenciId, vakit) {
    const anahtar = `${ogrenciId}:${vakit}`;
    const mevcutDurum = kayitMap[anahtar]?.durum ?? null;
    const suankiIndeks = DURUM_SIRASI.indexOf(mevcutDurum);
    const sonrakiDurum = DURUM_SIRASI[(suankiIndeks + 1) % DURUM_SIRASI.length];

    setKaydedenAnahtar(anahtar);
    if (sonrakiDurum === null) {
      await fetch(`/api/namaz-yoklama?ogrenci_id=${ogrenciId}&tarih=${tarih}&vakit=${vakit}`, { method: "DELETE" });
      setKayitMap((m) => {
        const yeni = { ...m };
        delete yeni[anahtar];
        return yeni;
      });
    } else {
      const res = await fetch("/api/namaz-yoklama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ogrenci_id: ogrenciId, tarih, vakit, durum: sonrakiDurum }),
      });
      const d = await res.json();
      if (d.kayit) setKayitMap((m) => ({ ...m, [anahtar]: d.kayit }));
    }
    setKaydedenAnahtar(null);
  }

  const toplamHucre = ogrenciler.length * VAKITLER.length;
  const kilinan = Object.values(kayitMap).filter((k) => k.durum === "kildi" || k.durum === "gec_kildi").length;

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
      <p className="sayfa-alt">Bir vakte tıkladıkça sırayla değişir: boş → Kıldı → Geç Kıldı → Kılmadı → boş. Anında kaydedilir.</p>

      <div className="grup-sekme">
        {gruplar.map((g) => (
          <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
            {g.isim}
          </button>
        ))}
      </div>

      {!yukleniyor && ogrenciler.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <span className="rozet rozet-yesil">
            {kilinan} / {toplamHucre} vakit kılındı
          </span>
        </div>
      )}

      <div className="kart">
        <div className="kart-ic" style={{ overflowX: "auto" }}>
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && ogrenciler.length === 0 && (
            <div className="bos-durum">Bu grupta kayıtlı öğrenci yok. Yönetim sayfasından öğrenci ekleyin.</div>
          )}
          {!yukleniyor && ogrenciler.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  {VAKITLER.map((v) => (
                    <th key={v.anahtar} style={{ textAlign: "center" }}>
                      {v.etiket}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ogrenciler.map((o) => (
                  <tr key={o.id}>
                    <td className="ogrenci-ad">{o.ad_soyad}</td>
                    {VAKITLER.map((v) => {
                      const anahtar = `${o.id}:${v.anahtar}`;
                      const durum = kayitMap[anahtar]?.durum;
                      const kaydediliyor = kaydedenAnahtar === anahtar;
                      return (
                        <td key={v.anahtar} style={{ textAlign: "center" }}>
                          <button
                            className={`durum-btn ${durum ? DURUM_SINIF[durum] : ""}`}
                            disabled={kaydediliyor}
                            onClick={() => tikla(o.id, v.anahtar)}
                            style={{ minWidth: 88 }}
                          >
                            {durum ? DURUM_ETIKET[durum] : "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

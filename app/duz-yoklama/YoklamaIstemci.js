"use client";
import { useEffect, useState, useCallback } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function YoklamaIstemci({ isAdmin }) {
  const [turler, setTurler] = useState([]);
  const [turId, setTurId] = useState(null);
  const [yeniTurAcik, setYeniTurAcik] = useState(false);
  const [yeniTurAdi, setYeniTurAdi] = useState("");
  const [turEkleniyor, setTurEkleniyor] = useState(false);

  const [gruplar, setGruplar] = useState([]);
  const [grupId, setGrupId] = useState(null);
  const [tarih, setTarih] = useState(bugun());
  const [ogrenciler, setOgrenciler] = useState([]);
  const [kayitMap, setKayitMap] = useState({}); // ogrenci_id -> {durum, saat}
  const [acikGelmedi, setAcikGelmedi] = useState({}); // ogrenci_id -> bool
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydedenId, setKaydedenId] = useState(null);

  const turleriGetir = useCallback(() => {
    fetch("/api/yoklama-turleri")
      .then((r) => r.json())
      .then((d) => {
        setTurler(d.turler || []);
        setTurId((mevcut) => mevcut || d.turler?.[0]?.id || null);
      });
  }, []);
  useEffect(() => turleriGetir(), [turleriGetir]);

  useEffect(() => {
    fetch("/api/gruplar")
      .then((r) => r.json())
      .then((d) => {
        setGruplar(d.gruplar || []);
        if (d.gruplar?.length) setGrupId(d.gruplar[0].id);
      });
  }, []);

  const veriGetir = useCallback(() => {
    if (!grupId || !tarih || !turId) return;
    setYukleniyor(true);
    fetch(`/api/yoklama?grup_id=${grupId}&tarih=${tarih}&tur_id=${turId}`)
      .then((r) => r.json())
      .then((d) => {
        setOgrenciler(d.ogrenciler || []);
        const map = {};
        (d.kayitlar || []).forEach((k) => (map[k.ogrenci_id] = k));
        setKayitMap(map);
        setAcikGelmedi({});
        setYukleniyor(false);
      });
  }, [grupId, tarih, turId]);

  useEffect(() => veriGetir(), [veriGetir]);

  async function isaretle(ogrenciId, durum) {
    setKaydedenId(ogrenciId);
    const res = await fetch("/api/yoklama", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ogrenci_id: ogrenciId, tarih, tur_id: turId, durum }),
    });
    const d = await res.json();
    if (d.kayit) {
      setKayitMap((m) => ({ ...m, [ogrenciId]: d.kayit }));
      setAcikGelmedi((a) => ({ ...a, [ogrenciId]: false }));
    }
    setKaydedenId(null);
  }

  async function yeniTurEkle(e) {
    e.preventDefault();
    if (!yeniTurAdi.trim()) return;
    setTurEkleniyor(true);
    const res = await fetch("/api/yoklama-turleri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: yeniTurAdi, siralama: turler.length + 1 }),
    });
    const d = await res.json();
    setTurEkleniyor(false);
    if (d.tur) {
      setYeniTurAdi("");
      setYeniTurAcik(false);
      turleriGetir();
      setTurId(d.tur.id);
    }
  }

  const gelenSayisi = Object.values(kayitMap).filter((k) => k.durum === "geldi").length;
  const izinliSayisi = Object.values(kayitMap).filter((k) => k.durum === "izinli").length;
  const izinsizSayisi = Object.values(kayitMap).filter((k) => k.durum === "izinsiz").length;
  const isaretsizSayisi = ogrenciler.length - gelenSayisi - izinliSayisi - izinsizSayisi;

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Yoklama</h1>
        <input
          type="date"
          className="girdi"
          style={{ width: 170 }}
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
          max={bugun()}
        />
      </div>
      <p className="sayfa-alt">Önce hangi amaçla yoklama aldığınızı seçin, sonra "Geldi"'ye basınca saat otomatik kaydedilir.</p>

      <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Yoklama türü</label>
      <div className="grup-sekme">
        {turler.map((t) => (
          <button key={t.id} className={turId === t.id ? "aktif" : ""} onClick={() => setTurId(t.id)}>
            {t.isim}
          </button>
        ))}
        {isAdmin && !yeniTurAcik && (
          <button className="btn-hayalet-sekme" onClick={() => setYeniTurAcik(true)}>
            + Yeni tür
          </button>
        )}
      </div>
      {isAdmin && yeniTurAcik && (
        <form onSubmit={yeniTurEkle} style={{ display: "flex", gap: 8, marginBottom: 16, maxWidth: 360 }}>
          <input
            className="girdi"
            autoFocus
            placeholder="Örn. Pazar İzin Dönüşü"
            value={yeniTurAdi}
            onChange={(e) => setYeniTurAdi(e.target.value)}
          />
          <button className="btn btn-lacivert btn-sm" disabled={turEkleniyor}>
            Ekle
          </button>
          <button type="button" className="btn btn-hayalet btn-sm" onClick={() => setYeniTurAcik(false)}>
            Vazgeç
          </button>
        </form>
      )}

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
          <span className="rozet rozet-yesil">{gelenSayisi} geldi</span>
          <span className="rozet rozet-amber">{izinliSayisi} izinli</span>
          <span className="rozet rozet-kirmizi">{izinsizSayisi} izinsiz</span>
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
              const kayit = kayitMap[o.id];
              const durum = kayit?.durum;
              const gelmediAcik = acikGelmedi[o.id];
              return (
                <div className="ogrenci-satir" key={o.id}>
                  <div>
                    <div className="ogrenci-ad">{o.ad_soyad}</div>
                    <div className="ogrenci-detay">
                      {durum === "geldi" && kayit?.saat && <>Saat {kayit.saat.slice(0, 5)} itibarıyla geldi</>}
                      {durum === "izinli" && <>İzinli olarak işaretlendi</>}
                      {durum === "izinsiz" && <>İzinsiz olarak işaretlendi</>}
                      {!durum && <>Henüz işaretlenmedi</>}
                    </div>
                  </div>

                  {!gelmediAcik && (
                    <div className="durum-btn-grup">
                      <button
                        className={`durum-btn ${durum === "geldi" ? "secili-geldi" : ""}`}
                        disabled={kaydedenId === o.id}
                        onClick={() => isaretle(o.id, "geldi")}
                      >
                        Geldi
                      </button>
                      <button
                        className={`durum-btn ${durum === "izinli" || durum === "izinsiz" ? (durum === "izinli" ? "secili-izinli" : "secili-izinsiz") : ""}`}
                        disabled={kaydedenId === o.id}
                        onClick={() => setAcikGelmedi((a) => ({ ...a, [o.id]: true }))}
                      >
                        {durum === "izinli" ? "İzinli" : durum === "izinsiz" ? "İzinsiz" : "Gelmedi"}
                      </button>
                    </div>
                  )}
                  {gelmediAcik && (
                    <div className="durum-btn-grup">
                      <button className="durum-btn secili-izinli" disabled={kaydedenId === o.id} onClick={() => isaretle(o.id, "izinli")}>
                        İzinli
                      </button>
                      <button className="durum-btn secili-izinsiz" disabled={kaydedenId === o.id} onClick={() => isaretle(o.id, "izinsiz")}>
                        İzinsiz
                      </button>
                      <button className="btn btn-hayalet btn-sm" onClick={() => setAcikGelmedi((a) => ({ ...a, [o.id]: false }))}>
                        Vazgeç
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

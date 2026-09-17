"use client";
import { useEffect, useState, useCallback } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function GorevIstemci({ isAdmin }) {
  const [listeler, setListeler] = useState([]);
  const [listeId, setListeId] = useState(null);
  const [yonetimAcik, setYonetimAcik] = useState(false);

  const listeleriGetir = useCallback(() => {
    fetch("/api/gorev-listeleri")
      .then((r) => r.json())
      .then((d) => {
        setListeler(d.listeler || []);
        setListeId((mevcut) => mevcut || d.listeler?.[0]?.id || null);
      });
  }, []);

  useEffect(() => listeleriGetir(), [listeleriGetir]);

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Görev Listeleri</h1>
        {isAdmin && (
          <button className="btn btn-hayalet btn-sm" onClick={() => setYonetimAcik((a) => !a)}>
            {yonetimAcik ? "Yönetimi kapat" : "Liste / kişi yönetimi"}
          </button>
        )}
      </div>
      <p className="sayfa-alt">Yemekçilik, müezzinlik, nöbetçi — sıralı görev takibi. Her gün için yaptı/yapmadı ve not girin.</p>

      <div className="grup-sekme">
        {listeler.map((l) => (
          <button key={l.id} className={listeId === l.id ? "aktif" : ""} onClick={() => setListeId(l.id)}>
            {l.isim}
          </button>
        ))}
      </div>

      {isAdmin && yonetimAcik && (
        <YonetimPaneli listeler={listeler} listeId={listeId} onDegisti={listeleriGetir} />
      )}

      {listeId && <GorevTablosu listeId={listeId} />}
      {!listeId && <div className="bos-durum">Henüz bir görev listesi yok.</div>}
    </>
  );
}

/* ================= GÖREV TABLOSU (günlük yaptı/yapmadı) ================= */
function GorevTablosu({ listeId }) {
  const [tarih, setTarih] = useState(bugun());
  const [kisiler, setKisiler] = useState([]);
  const [kayitMap, setKayitMap] = useState({}); // kisi_id -> kayit
  const [notAcikId, setNotAcikId] = useState(null);
  const [notTaslak, setNotTaslak] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydedenId, setKaydedenId] = useState(null);

  const getir = useCallback(() => {
    if (!listeId) return;
    setYukleniyor(true);
    Promise.all([
      fetch(`/api/gorev-kisileri?liste_id=${listeId}`).then((r) => r.json()),
      fetch(`/api/gorev-kayitlari?liste_id=${listeId}&tarih=${tarih}`).then((r) => r.json()),
    ]).then(([kd, gd]) => {
      setKisiler(kd.kisiler || []);
      const map = {};
      (gd.kayitlar || []).forEach((k) => (map[k.kisi_id] = k));
      setKayitMap(map);
      setYukleniyor(false);
    });
  }, [listeId, tarih]);

  useEffect(() => getir(), [getir]);

  async function isaretle(kisiId, yapildi, notMetni) {
    setKaydedenId(kisiId);
    const res = await fetch("/api/gorev-kayitlari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liste_id: listeId, kisi_id: kisiId, tarih, yapildi, not_metni: notMetni }),
    });
    const d = await res.json();
    if (d.kayit) setKayitMap((m) => ({ ...m, [kisiId]: d.kayit }));
    setKaydedenId(null);
    setNotAcikId(null);
  }

  const yapilan = Object.values(kayitMap).filter((k) => k.yapildi).length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <input type="date" className="girdi" style={{ width: 170 }} value={tarih} onChange={(e) => setTarih(e.target.value)} max={bugun()} />
        {!yukleniyor && kisiler.length > 0 && (
          <span className="rozet rozet-yesil">
            {yapilan} / {kisiler.length} yapıldı
          </span>
        )}
      </div>

      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && kisiler.length === 0 && (
            <div className="bos-durum">Bu listede henüz kişi yok. "Liste / kişi yönetimi"nden ekleyin.</div>
          )}
          {!yukleniyor &&
            kisiler.map((k, i) => {
              const kayit = kayitMap[k.id];
              const notAcik = notAcikId === k.id;
              return (
                <div className="ogrenci-satir" key={k.id}>
                  <div>
                    <div className="ogrenci-ad">
                      <span style={{ color: "var(--metin-soluk)", fontWeight: 400 }}>{i + 1}. </span>
                      {k.ad_soyad}
                    </div>
                    <div className="ogrenci-detay">
                      {kayit?.yapildi ? "Yaptı olarak işaretlendi" : "Henüz işaretlenmedi"}
                      {kayit?.not_metni ? ` · Not: ${kayit.not_metni}` : ""}
                    </div>
                  </div>

                  {!notAcik && (
                    <div className="durum-btn-grup">
                      <button
                        className={`durum-btn ${kayit?.yapildi ? "secili-geldi" : ""}`}
                        disabled={kaydedenId === k.id}
                        onClick={() => isaretle(k.id, true, kayit?.not_metni)}
                      >
                        Yaptı
                      </button>
                      <button
                        className={`durum-btn ${kayit && !kayit.yapildi ? "secili-izinsiz" : ""}`}
                        disabled={kaydedenId === k.id}
                        onClick={() => isaretle(k.id, false, kayit?.not_metni)}
                      >
                        Yapmadı
                      </button>
                      <button
                        className="btn btn-hayalet btn-sm"
                        onClick={() => {
                          setNotTaslak(kayit?.not_metni || "");
                          setNotAcikId(k.id);
                        }}
                      >
                        Not {kayit?.not_metni ? "düzenle" : "ekle"}
                      </button>
                    </div>
                  )}
                  {notAcik && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 220 }}>
                      <input
                        className="girdi"
                        placeholder="Not..."
                        value={notTaslak}
                        onChange={(e) => setNotTaslak(e.target.value)}
                        autoFocus
                      />
                      <button
                        className="btn btn-lacivert btn-sm"
                        disabled={kaydedenId === k.id}
                        onClick={() => isaretle(k.id, kayit?.yapildi ?? false, notTaslak)}
                      >
                        Kaydet
                      </button>
                      <button className="btn btn-hayalet btn-sm" onClick={() => setNotAcikId(null)}>
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

/* ================= YÖNETİM PANELİ (admin) ================= */
function YonetimPaneli({ listeler, listeId, onDegisti }) {
  const [kisiler, setKisiler] = useState([]);
  const [yeniKisi, setYeniKisi] = useState("");
  const [yeniListeAdi, setYeniListeAdi] = useState("");
  const [ekleniyor, setEkleniyor] = useState(false);

  const getir = useCallback(() => {
    if (!listeId) return;
    fetch(`/api/gorev-kisileri?liste_id=${listeId}`)
      .then((r) => r.json())
      .then((d) => setKisiler(d.kisiler || []));
  }, [listeId]);

  useEffect(() => getir(), [getir]);

  async function kisiEkle(e) {
    e.preventDefault();
    if (!yeniKisi.trim() || !listeId) return;
    setEkleniyor(true);
    await fetch("/api/gorev-kisileri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liste_id: listeId, ad_soyad: yeniKisi, sira: kisiler.length + 1 }),
    });
    setYeniKisi("");
    setEkleniyor(false);
    getir();
  }

  async function kisiSil(id) {
    if (!confirm("Bu kişiyi listeden kaldırmak istediğinize emin misiniz?")) return;
    await fetch(`/api/gorev-kisileri/${id}`, { method: "DELETE" });
    getir();
  }

  async function listeEkle(e) {
    e.preventDefault();
    if (!yeniListeAdi.trim()) return;
    setEkleniyor(true);
    await fetch("/api/gorev-listeleri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: yeniListeAdi, siralama: listeler.length + 1 }),
    });
    setYeniListeAdi("");
    setEkleniyor(false);
    onDegisti();
  }

  return (
    <div className="kart" style={{ marginBottom: 20 }}>
      <div className="kart-ic" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Seçili listedeki kişiler (sıralı)</h3>
          {kisiler.length === 0 && <div className="bos-durum" style={{ padding: "20px 0" }}>Henüz kişi yok.</div>}
          {kisiler.map((k, i) => (
            <div className="ogrenci-satir" key={k.id}>
              <div className="ogrenci-ad">
                {i + 1}. {k.ad_soyad}
              </div>
              <button className="btn btn-tehlike btn-sm" onClick={() => kisiSil(k.id)}>
                Kaldır
              </button>
            </div>
          ))}
          <form onSubmit={kisiEkle} style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input className="girdi" placeholder="Ad Soyad" value={yeniKisi} onChange={(e) => setYeniKisi(e.target.value)} />
            <button className="btn btn-lacivert" disabled={ekleniyor}>
              Ekle
            </button>
          </form>
        </div>
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Yeni liste oluştur</h3>
          <form onSubmit={listeEkle} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="girdi"
              placeholder="Örn. Temizlik"
              value={yeniListeAdi}
              onChange={(e) => setYeniListeAdi(e.target.value)}
            />
            <button className="btn btn-hayalet" disabled={ekleniyor}>
              Liste oluştur
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback, useMemo } from "react";

const VAKITLER = [
  { anahtar: "sabah", etiket: "Sabah" },
  { anahtar: "ogle", etiket: "Öğle" },
  { anahtar: "ikindi", etiket: "İkindi" },
  { anahtar: "aksam", etiket: "Akşam" },
  { anahtar: "yatsi", etiket: "Yatsı" },
];

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function GorevIstemci({ isAdmin, baslangicListeler }) {
  const [listeler, setListeler] = useState(baslangicListeler || []);
  const [listeId, setListeId] = useState(baslangicListeler?.[0]?.id || null);
  const [yonetimAcik, setYonetimAcik] = useState(false);

  const listeleriGetir = useCallback(() => {
    fetch("/api/gorev-listeleri")
      .then((r) => r.json())
      .then((d) => {
        setListeler(d.listeler || []);
        setListeId((mevcut) => mevcut || d.listeler?.[0]?.id || null);
      });
  }, []);

  const seciliListe = listeler.find((l) => l.id === listeId);

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Görev Listeleri</h1>
        {isAdmin && (
          <button className="btn btn-hayalet btn-sm" onClick={() => setYonetimAcik((a) => !a)}>
            {yonetimAcik ? "Yönetimi kapat" : "Liste / kişi / grup yönetimi"}
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

      {listeId && seciliListe?.vakit_bazli && <GorevVakitTablosu listeId={listeId} />}
      {listeId && !seciliListe?.vakit_bazli && <GorevTablosu listeId={listeId} />}
      {!listeId && <div className="bos-durum">Henüz bir görev listesi yok.</div>}
    </>
  );
}

/* ================= GÖREV TABLOSU (günlük yaptı/yapmadı, grup grup) ================= */
function GorevTablosu({ listeId }) {
  const [tarih, setTarih] = useState(bugun());
  const [kisiler, setKisiler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
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
      fetch(`/api/gorev-gruplari?liste_id=${listeId}`).then((r) => r.json()),
    ]).then(([kd, gd, grd]) => {
      setKisiler(kd.kisiler || []);
      const map = {};
      (gd.kayitlar || []).forEach((k) => (map[k.kisi_id] = k));
      setKayitMap(map);
      setGruplar(grd.gruplar || []);
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

  async function isaretiSil(kisiId) {
    setKaydedenId(kisiId);
    await fetch(`/api/gorev-kayitlari?kisi_id=${kisiId}&tarih=${tarih}`, { method: "DELETE" });
    setKayitMap((m) => {
      const yeni = { ...m };
      delete yeni[kisiId];
      return yeni;
    });
    setKaydedenId(null);
  }

  const yapilan = Object.values(kayitMap).filter((k) => k.yapildi).length;

  const bloklar = useMemo(() => {
    if (!gruplar.length) return [{ grup: null, kisiler }];
    const bloklar_ = gruplar.map((g) => ({ grup: g, kisiler: kisiler.filter((k) => k.grup_id === g.id) }));
    const grupsuz = kisiler.filter((k) => !k.grup_id);
    if (grupsuz.length) bloklar_.push({ grup: null, kisiler: grupsuz });
    return bloklar_;
  }, [gruplar, kisiler]);

  function kisiSatiri(k, i) {
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
            {kayit && (
              <button className="btn btn-hayalet btn-sm" disabled={kaydedenId === k.id} onClick={() => isaretiSil(k.id)}>
                Sıfırla
              </button>
            )}
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
            <button className="btn btn-lacivert btn-sm" disabled={kaydedenId === k.id} onClick={() => isaretle(k.id, kayit?.yapildi ?? false, notTaslak)}>
              Kaydet
            </button>
            <button className="btn btn-hayalet btn-sm" onClick={() => setNotAcikId(null)}>
              Vazgeç
            </button>
          </div>
        )}
      </div>
    );
  }

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

      {yukleniyor && (
        <div className="kart">
          <div className="kart-ic">
            <div className="bos-durum">Yükleniyor...</div>
          </div>
        </div>
      )}
      {!yukleniyor && kisiler.length === 0 && (
        <div className="kart">
          <div className="kart-ic">
            <div className="bos-durum">Bu listede henüz kişi yok. "Liste / kişi / grup yönetimi"nden ekleyin.</div>
          </div>
        </div>
      )}
      {!yukleniyor &&
        kisiler.length > 0 &&
        bloklar.map((blok, bi) => {
          if (blok.kisiler.length === 0) return null;
          const blokYapilan = blok.kisiler.filter((k) => kayitMap[k.id]?.yapildi).length;
          return (
            <div key={blok.grup?.id || `grupsuz-${bi}`} className="kart" style={{ marginBottom: 16 }}>
              {(gruplar.length > 0) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 0" }}>
                  <h3 style={{ fontSize: 14.5, margin: 0, color: "var(--lacivert)" }}>{blok.grup ? blok.grup.isim : "Diğer (grupsuz)"}</h3>
                  <span className="rozet rozet-yesil">
                    {blokYapilan} / {blok.kisiler.length} yaptı
                  </span>
                </div>
              )}
              <div className="kart-ic">{blok.kisiler.map((k, i) => kisiSatiri(k, i))}</div>
            </div>
          );
        })}
    </>
  );
}

/* ================= GÖREV VAKİT TABLOSU (Müezzinlik gibi 5 vakitli listeler) ================= */
const G_DURUM_SIRASI = [null, "yapildi", "yapilmadi"];

function GorevVakitTablosu({ listeId }) {
  const [tarih, setTarih] = useState(bugun());
  const [kisiler, setKisiler] = useState([]);
  const [kayitMap, setKayitMap] = useState({}); // `${kisi_id}:${vakit}` -> kayit
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydedenAnahtar, setKaydedenAnahtar] = useState(null);

  const getir = useCallback(() => {
    if (!listeId) return;
    setYukleniyor(true);
    Promise.all([
      fetch(`/api/gorev-kisileri?liste_id=${listeId}`).then((r) => r.json()),
      fetch(`/api/gorev-kayitlari?liste_id=${listeId}&tarih=${tarih}`).then((r) => r.json()),
    ]).then(([kd, gd]) => {
      setKisiler(kd.kisiler || []);
      const map = {};
      (gd.kayitlar || []).filter((k) => k.vakit !== "gun").forEach((k) => (map[`${k.kisi_id}:${k.vakit}`] = k));
      setKayitMap(map);
      setYukleniyor(false);
    });
  }, [listeId, tarih]);

  useEffect(() => getir(), [getir]);

  async function tikla(kisiId, vakit) {
    const anahtar = `${kisiId}:${vakit}`;
    const mevcut = kayitMap[anahtar]?.yapildi === true ? "yapildi" : kayitMap[anahtar]?.yapildi === false ? "yapilmadi" : null;
    const suankiIndeks = G_DURUM_SIRASI.indexOf(mevcut);
    const sonraki = G_DURUM_SIRASI[(suankiIndeks + 1) % G_DURUM_SIRASI.length];

    setKaydedenAnahtar(anahtar);
    if (sonraki === null) {
      await fetch(`/api/gorev-kayitlari?kisi_id=${kisiId}&tarih=${tarih}&vakit=${vakit}`, { method: "DELETE" });
      setKayitMap((m) => {
        const yeni = { ...m };
        delete yeni[anahtar];
        return yeni;
      });
    } else {
      const res = await fetch("/api/gorev-kayitlari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liste_id: listeId, kisi_id: kisiId, tarih, vakit, yapildi: sonraki === "yapildi" }),
      });
      const d = await res.json();
      if (d.kayit) setKayitMap((m) => ({ ...m, [anahtar]: d.kayit }));
    }
    setKaydedenAnahtar(null);
  }

  const toplamHucre = kisiler.length * VAKITLER.length;
  const yapilan = Object.values(kayitMap).filter((k) => k.yapildi).length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <input type="date" className="girdi" style={{ width: 170 }} value={tarih} onChange={(e) => setTarih(e.target.value)} max={bugun()} />
        {!yukleniyor && kisiler.length > 0 && (
          <span className="rozet rozet-yesil">
            {yapilan} / {toplamHucre} vakit yapıldı
          </span>
        )}
      </div>
      <p className="sayfa-alt" style={{ marginTop: -10 }}>
        Bir vakte tıkladıkça sırayla değişir: boş → Yaptı → Yapmadı → boş. O vaktin müezzini kimse, onun satırında işaretleyin.
      </p>

      <div className="kart">
        <div className="kart-ic" style={{ overflowX: "auto" }}>
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && kisiler.length === 0 && (
            <div className="bos-durum">Bu listede henüz kişi yok. "Liste / kişi / grup yönetimi"nden ekleyin.</div>
          )}
          {!yukleniyor && kisiler.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Kişi</th>
                  {VAKITLER.map((v) => (
                    <th key={v.anahtar} style={{ textAlign: "center" }}>
                      {v.etiket}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kisiler.map((k) => (
                  <tr key={k.id}>
                    <td className="ogrenci-ad">{k.ad_soyad}</td>
                    {VAKITLER.map((v) => {
                      const anahtar = `${k.id}:${v.anahtar}`;
                      const kayit = kayitMap[anahtar];
                      const durum = kayit?.yapildi === true ? "yapildi" : kayit?.yapildi === false ? "yapilmadi" : null;
                      const kaydediliyor = kaydedenAnahtar === anahtar;
                      return (
                        <td key={v.anahtar} style={{ textAlign: "center" }}>
                          <button
                            className={`durum-btn ${durum === "yapildi" ? "secili-geldi" : durum === "yapilmadi" ? "secili-izinsiz" : ""}`}
                            disabled={kaydediliyor}
                            onClick={() => tikla(k.id, v.anahtar)}
                            style={{ minWidth: 84 }}
                          >
                            {durum === "yapildi" ? "Yaptı" : durum === "yapilmadi" ? "Yapmadı" : "—"}
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

/* ================= YÖNETİM PANELİ (admin) ================= */
function YonetimPaneli({ listeler, listeId, onDegisti }) {
  const [kisiler, setKisiler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
  const [yeniKisi, setYeniKisi] = useState("");
  const [yeniKisiGrup, setYeniKisiGrup] = useState("");
  const [yeniGrupAdi, setYeniGrupAdi] = useState("");
  const [yeniListeAdi, setYeniListeAdi] = useState("");
  const [yeniListeVakitli, setYeniListeVakitli] = useState(false);
  const [ekleniyor, setEkleniyor] = useState(false);

  const seciliListe = listeler.find((l) => l.id === listeId);

  const getir = useCallback(() => {
    if (!listeId) return;
    fetch(`/api/gorev-kisileri?liste_id=${listeId}`)
      .then((r) => r.json())
      .then((d) => setKisiler(d.kisiler || []));
    fetch(`/api/gorev-gruplari?liste_id=${listeId}`)
      .then((r) => r.json())
      .then((d) => setGruplar(d.gruplar || []));
  }, [listeId]);

  useEffect(() => getir(), [getir]);

  async function kisiEkle(e) {
    e.preventDefault();
    if (!yeniKisi.trim() || !listeId) return;
    setEkleniyor(true);
    await fetch("/api/gorev-kisileri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liste_id: listeId, ad_soyad: yeniKisi, sira: kisiler.length + 1, grup_id: yeniKisiGrup || null }),
    });
    setYeniKisi("");
    setEkleniyor(false);
    getir();
  }

  async function kisiGrubunuDegistir(kisiId, grupId) {
    await fetch(`/api/gorev-kisileri/${kisiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grup_id: grupId || null }),
    });
    getir();
  }

  async function kisiSil(id) {
    if (!confirm("Bu kişiyi listeden kaldırmak istediğinize emin misiniz?")) return;
    await fetch(`/api/gorev-kisileri/${id}`, { method: "DELETE" });
    getir();
  }

  async function grupEkle(e) {
    e.preventDefault();
    if (!yeniGrupAdi.trim() || !listeId) return;
    setEkleniyor(true);
    await fetch("/api/gorev-gruplari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liste_id: listeId, isim: yeniGrupAdi, siralama: gruplar.length + 1 }),
    });
    setYeniGrupAdi("");
    setEkleniyor(false);
    getir();
  }

  async function grupSil(id) {
    if (!confirm("Bu grubu silmek istediğinize emin misiniz? İçindeki kişiler grupsuz kalır, silinmez.")) return;
    await fetch(`/api/gorev-gruplari/${id}`, { method: "DELETE" });
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
    setYeniListeVakitli(false);
    setEkleniyor(false);
    onDegisti();
  }

  async function vakitliDegistir() {
    if (!seciliListe) return;
    await fetch(`/api/gorev-listeleri/${seciliListe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vakit_bazli: !seciliListe.vakit_bazli }),
    });
    onDegisti();
  }

  return (
    <div className="kart" style={{ marginBottom: 20 }}>
      <div className="kart-ic" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 280px", gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Seçili listedeki kişiler</h3>
          {kisiler.length === 0 && <div className="bos-durum" style={{ padding: "20px 0" }}>Henüz kişi yok.</div>}
          {kisiler.map((k, i) => (
            <div className="ogrenci-satir" key={k.id}>
              <div className="ogrenci-ad">
                {i + 1}. {k.ad_soyad}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  className="girdi"
                  style={{ width: 140 }}
                  value={k.grup_id || ""}
                  onChange={(e) => kisiGrubunuDegistir(k.id, e.target.value)}
                >
                  <option value="">Grupsuz</option>
                  {gruplar.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.isim}
                    </option>
                  ))}
                </select>
                <button className="btn btn-tehlike btn-sm" onClick={() => kisiSil(k.id)}>
                  Kaldır
                </button>
              </div>
            </div>
          ))}
          <form onSubmit={kisiEkle} style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <input className="girdi" placeholder="Ad Soyad" value={yeniKisi} onChange={(e) => setYeniKisi(e.target.value)} />
            {gruplar.length > 0 && (
              <select className="girdi" style={{ width: 140 }} value={yeniKisiGrup} onChange={(e) => setYeniKisiGrup(e.target.value)}>
                <option value="">Grupsuz</option>
                {gruplar.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.isim}
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-lacivert" disabled={ekleniyor}>
              Ekle
            </button>
          </form>
        </div>

        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Bu listenin grupları</h3>
          <p style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginTop: -6, marginBottom: 12 }}>
            Örn. Yemekçilik için "1. Grup", "2. Grup" gibi alt gruplar açıp kişileri bu gruplara dağıtabilirsiniz.
          </p>
          {gruplar.length === 0 && <div className="bos-durum" style={{ padding: "20px 0" }}>Henüz grup yok, hepsi tek listede görünür.</div>}
          {gruplar.map((g) => (
            <div className="ogrenci-satir" key={g.id}>
              <div className="ogrenci-ad">{g.isim}</div>
              <button className="btn btn-tehlike btn-sm" onClick={() => grupSil(g.id)}>
                Sil
              </button>
            </div>
          ))}
          <form onSubmit={grupEkle} style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input className="girdi" placeholder="Örn. 1. Grup" value={yeniGrupAdi} onChange={(e) => setYeniGrupAdi(e.target.value)} />
            <button className="btn btn-lacivert" disabled={ekleniyor}>
              Ekle
            </button>
          </form>

          {seciliListe && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--kenar)" }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>"{seciliListe.isim}" için takip biçimi</h3>
              <p style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginBottom: 10 }}>
                Vakit bazlı: Müezzinlik gibi, günde 5 vakit ayrı ayrı işaretlenir. Kapalıyken günde tek yaptı/yapmadı girilir.
              </p>
              <button className="btn btn-hayalet btn-sm" onClick={vakitliDegistir}>
                {seciliListe.vakit_bazli ? "Vakit bazlı: Açık — kapat" : "Vakit bazlı: Kapalı — aç"}
              </button>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Yeni liste oluştur</h3>
          <form onSubmit={listeEkle} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="girdi"
              placeholder="Örn. Çaycı"
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

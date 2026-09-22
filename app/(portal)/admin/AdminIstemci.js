"use client";
import { useEffect, useState, useCallback } from "react";
import { MODULLER } from "../../../lib/moduller";

const SEKMELER = [
  { id: "ogrenciler", etiket: "Öğrenciler" },
  { id: "kodlar", etiket: "Erişim Kodları" },
  { id: "gruplar", etiket: "Gruplar" },
];

export default function AdminIstemci() {
  const [sekme, setSekme] = useState("ogrenciler");
  return (
    <>
      <div className="sayfa-baslik">
        <h1>Yönetim</h1>
      </div>
      <p className="sayfa-alt">Öğrenci ekleyin, personelinize giriş kodu tanımlayın, grup ayarlarını yönetin.</p>
      <div className="grup-sekme">
        {SEKMELER.map((s) => (
          <button key={s.id} className={sekme === s.id ? "aktif" : ""} onClick={() => setSekme(s.id)}>
            {s.etiket}
          </button>
        ))}
      </div>
      {sekme === "ogrenciler" && <OgrencilerPaneli />}
      {sekme === "kodlar" && <KodlarPaneli />}
      {sekme === "gruplar" && <GruplarPaneli />}
    </>
  );
}

/* ================= ÖĞRENCİLER ================= */
function haritaLinki(adres) {
  if (!adres || !adres.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres.trim())}`;
}

// Bir öğrencinin yakınlar tablosundan (ogrenci_yakinlari) kısa özet satırı.
// v9 SQL'i henüz çalıştırılmadıysa eski anne/baba/diğer/veli alanlarına
// geri düşer.
function ogrenciYakinlari(o) {
  const yakinlar = Array.isArray(o.ogrenci_yakinlari) ? [...o.ogrenci_yakinlari].sort((a, b) => a.siralama - b.siralama) : [];
  if (yakinlar.length) return yakinlar;

  const eski = [];
  if (o.anne_adi || o.anne_telefon) eski.push({ id: "eski-anne", yakinlik: "Anne", ad_soyad: o.anne_adi, telefon: o.anne_telefon, meslek: o.anne_meslek });
  if (o.baba_adi || o.baba_telefon) eski.push({ id: "eski-baba", yakinlik: "Baba", ad_soyad: o.baba_adi, telefon: o.baba_telefon, meslek: o.baba_meslek });
  if (o.diger_yakin_adi || o.diger_yakin_telefon) {
    eski.push({ id: "eski-diger", yakinlik: o.diger_yakin_yakinlik || "Diğer", ad_soyad: o.diger_yakin_adi, telefon: o.diger_yakin_telefon });
  }
  if (!eski.length && (o.veli_adi || o.veli_telefon)) {
    eski.push({ id: "eski-veli", yakinlik: "Veli", ad_soyad: o.veli_adi, telefon: o.veli_telefon });
  }
  return eski;
}

function ogrenciVeliOzeti(o) {
  const yakinlar = ogrenciYakinlari(o);
  if (!yakinlar.length) return "Veli bilgisi girilmemiş";
  return yakinlar
    .map((y) => `${y.yakinlik}: ${y.ad_soyad || "-"}${y.meslek ? ` (${y.meslek})` : ""}${y.telefon ? ` · ${y.telefon}` : ""}`)
    .join("  ·  ");
}

const BOS_YAKIN = { yakinlik: "", ad_soyad: "", telefon: "", meslek: "", yasadigi_yer: "" };

function OgrencilerPaneli() {
  const [gruplar, setGruplar] = useState([]);
  const [sekmeGrupId, setSekmeGrupId] = useState("tumu");
  const [tumOgrenciler, setTumOgrenciler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [acikId, setAcikId] = useState(null);

  const [formAdSoyad, setFormAdSoyad] = useState("");
  const [formYasadigiYer, setFormYasadigiYer] = useState("");
  const [formGrupId, setFormGrupId] = useState(null);
  const [yakinlarTaslak, setYakinlarTaslak] = useState([{ ...BOS_YAKIN, yakinlik: "Anne" }, { ...BOS_YAKIN, yakinlik: "Baba" }]);
  const [ekleniyor, setEkleniyor] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    fetch("/api/gruplar")
      .then((r) => r.json())
      .then((d) => {
        setGruplar(d.gruplar || []);
        if (d.gruplar?.length) setFormGrupId((mevcut) => mevcut || d.gruplar[0].id);
      });
  }, []);

  const getir = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/ogrenciler")
      .then((r) => r.json())
      .then((d) => {
        setTumOgrenciler(d.ogrenciler || []);
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => getir(), [getir]);

  const gosterilenler = sekmeGrupId === "tumu" ? tumOgrenciler : tumOgrenciler.filter((o) => o.grup_id === sekmeGrupId);

  function yakinEkle() {
    setYakinlarTaslak((t) => [...t, { ...BOS_YAKIN }]);
  }
  function yakinSil(i) {
    setYakinlarTaslak((t) => t.filter((_, idx) => idx !== i));
  }
  function yakinDegistir(i, alan, deger) {
    setYakinlarTaslak((t) => t.map((y, idx) => (idx === i ? { ...y, [alan]: deger } : y)));
  }

  async function ekle(e) {
    e.preventDefault();
    setHata("");
    if (!formAdSoyad.trim() || !formGrupId) return;
    setEkleniyor(true);
    const res = await fetch("/api/ogrenciler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_soyad: formAdSoyad,
        grup_id: formGrupId,
        yasadigi_yer: formYasadigiYer,
        yakinlar: yakinlarTaslak.filter((y) => y.yakinlik.trim() && (y.ad_soyad.trim() || y.telefon.trim())),
      }),
    });
    const d = await res.json();
    setEkleniyor(false);
    if (d.error) return setHata(d.error);
    setFormAdSoyad("");
    setFormYasadigiYer("");
    setYakinlarTaslak([{ ...BOS_YAKIN, yakinlik: "Anne" }, { ...BOS_YAKIN, yakinlik: "Baba" }]);
    getir();
  }

  async function sil(id) {
    if (!confirm("Bu öğrenciyi listeden kaldırmak istediğinize emin misiniz? Geçmiş yoklama kayıtları saklanır.")) return;
    await fetch(`/api/ogrenciler/${id}`, { method: "DELETE" });
    getir();
  }

  async function yakinSilKayitli(yakinId) {
    await fetch(`/api/ogrenci-yakinlari/${yakinId}`, { method: "DELETE" });
    getir();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          <div className="grup-sekme">
            <button className={sekmeGrupId === "tumu" ? "aktif" : ""} onClick={() => setSekmeGrupId("tumu")}>
              Tümü
            </button>
            {gruplar.map((g) => (
              <button key={g.id} className={sekmeGrupId === g.id ? "aktif" : ""} onClick={() => setSekmeGrupId(g.id)}>
                {g.isim}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "var(--metin-soluk)", fontWeight: 600, marginBottom: 14 }}>
            Toplam {gosterilenler.length} öğrenci
          </div>
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && gosterilenler.length === 0 && <div className="bos-durum">Bu grupta henüz öğrenci yok.</div>}
          {!yukleniyor &&
            gosterilenler.map((o) => {
              const acik = acikId === o.id;
              const grupAdi = gruplar.find((g) => g.id === o.grup_id)?.isim;
              const yakinlar = ogrenciYakinlari(o);
              return (
                <div key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="ogrenci-satir" style={{ borderBottom: "none", cursor: "pointer" }} onClick={() => setAcikId(acik ? null : o.id)}>
                    <div>
                      <div className="ogrenci-ad">
                        {o.ad_soyad} {sekmeGrupId === "tumu" && grupAdi && <span className="rozet rozet-gri" style={{ marginLeft: 6, fontWeight: 600 }}>{grupAdi}</span>}
                      </div>
                      <div className="ogrenci-detay">{ogrenciVeliOzeti(o)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-hayalet btn-sm" onClick={(e) => { e.stopPropagation(); setAcikId(acik ? null : o.id); }}>
                        {acik ? "Kapat" : "Detay"}
                      </button>
                      <button className="btn btn-tehlike btn-sm" onClick={(e) => { e.stopPropagation(); sil(o.id); }}>
                        Kaldır
                      </button>
                    </div>
                  </div>

                  {acik && (
                    <div style={{ padding: "0 4px 16px" }}>
                      {o.yasadigi_yer && (
                        <div style={{ marginBottom: 10, fontSize: 13.5 }}>
                          Adres: {o.yasadigi_yer}{" "}
                          <a href={haritaLinki(o.yasadigi_yer)} target="_blank" rel="noopener noreferrer" className="btn btn-hayalet btn-sm" style={{ marginLeft: 6 }}>
                            🗺️ Haritada aç
                          </a>
                        </div>
                      )}
                      {yakinlar.length === 0 && <div className="bos-durum" style={{ padding: "8px 0", fontSize: 13 }}>Kayıtlı yakın yok.</div>}
                      {yakinlar.map((y) => (
                        <div key={y.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 13.5 }}>
                            <strong>{y.yakinlik}</strong>
                            {y.ad_soyad && <>: {y.ad_soyad}</>}
                            {y.meslek && <> ({y.meslek})</>}
                            {y.telefon && <> · {y.telefon}</>}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {(y.yasadigi_yer || o.yasadigi_yer) && (
                              <a href={haritaLinki(y.yasadigi_yer || o.yasadigi_yer)} target="_blank" rel="noopener noreferrer" className="btn btn-hayalet btn-sm">
                                🗺️
                              </a>
                            )}
                            {typeof y.id === "string" && !y.id.startsWith("eski-") && (
                              <button className="btn btn-tehlike btn-sm" onClick={() => yakinSilKayitli(y.id)}>
                                Kaldır
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div className="kart" style={{ alignSelf: "start" }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Yeni öğrenci ekle</h3>
          <form onSubmit={ekle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="etiket">Ad Soyad</label>
              <input className="girdi" value={formAdSoyad} onChange={(e) => setFormAdSoyad(e.target.value)} placeholder="Örn. Ahmet Yılmaz" />
            </div>
            <div>
              <label className="etiket">Grup</label>
              <select className="girdi" value={formGrupId || ""} onChange={(e) => setFormGrupId(e.target.value)}>
                {gruplar.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.isim}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiket">Yaşadığı yer (isteğe bağlı)</label>
              <input
                className="girdi"
                value={formYasadigiYer}
                onChange={(e) => setFormYasadigiYer(e.target.value)}
                placeholder="Örn. Fatih, İstanbul"
              />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--baslik)", marginTop: 6 }}>Veliler / yakınlar</div>
            {yakinlarTaslak.map((y, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="girdi"
                    style={{ flex: 1 }}
                    value={y.yakinlik}
                    onChange={(e) => yakinDegistir(i, "yakinlik", e.target.value)}
                    placeholder="Yakınlığı — Anne, Baba, Amca..."
                  />
                  <button type="button" className="btn btn-tehlike btn-sm" onClick={() => yakinSil(i)} title="Bu yakını kaldır">
                    ✕
                  </button>
                </div>
                <input className="girdi" value={y.ad_soyad} onChange={(e) => yakinDegistir(i, "ad_soyad", e.target.value)} placeholder="İsim soyisim" />
                <input className="girdi" value={y.telefon} onChange={(e) => yakinDegistir(i, "telefon", e.target.value)} placeholder="WhatsApp no — 05XX XXX XX XX" />
                <input className="girdi" value={y.meslek} onChange={(e) => yakinDegistir(i, "meslek", e.target.value)} placeholder="Mesleği (isteğe bağlı)" />
                <input
                  className="girdi"
                  value={y.yasadigi_yer}
                  onChange={(e) => yakinDegistir(i, "yasadigi_yer", e.target.value)}
                  placeholder="Yaşadığı yer (öğrenciden farklıysa)"
                />
              </div>
            ))}
            <button type="button" className="btn btn-hayalet btn-blok" onClick={yakinEkle}>
              + Veli Ekle
            </button>

            {hata && <div className="hata">{hata}</div>}
            <button className="btn btn-lacivert btn-blok" disabled={ekleniyor}>
              {ekleniyor ? "Ekleniyor..." : "Ekle"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ================= ERİŞİM KODLARI ================= */
function KodlarPaneli() {
  const [kodlar, setKodlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [form, setForm] = useState({ kod: "", sahip_adi: "", admin: false, moduller: [] });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [duzenlenenModuller, setDuzenlenenModuller] = useState([]);

  const getir = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/kodlar")
      .then((r) => r.json())
      .then((d) => {
        setKodlar(d.kodlar || []);
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => getir(), [getir]);

  function formModulToggle(anahtar) {
    setForm((f) => ({
      ...f,
      moduller: f.moduller.includes(anahtar) ? f.moduller.filter((m) => m !== anahtar) : [...f.moduller, anahtar],
    }));
  }

  async function ekle(e) {
    e.preventDefault();
    setHata("");
    if (!form.kod.trim() || !form.sahip_adi.trim()) return;
    setEkleniyor(true);
    const res = await fetch("/api/kodlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setEkleniyor(false);
    if (d.error) return setHata(d.error.includes("duplicate") ? "Bu kod zaten kullanılıyor." : d.error);
    setForm({ kod: "", sahip_adi: "", admin: false, moduller: [] });
    getir();
  }

  async function aktifligiDegistir(k) {
    await fetch(`/api/kodlar/${k.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !k.aktif }),
    });
    getir();
  }

  async function sil(id) {
    if (!confirm("Bu erişim kodunu tamamen silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/kodlar/${id}`, { method: "DELETE" });
    getir();
  }

  async function duzenlemeyiAc(k) {
    if (duzenlenenId === k.id) {
      setDuzenlenenId(null);
      return;
    }
    const res = await fetch(`/api/kodlar/${k.id}/moduller`);
    const d = await res.json();
    setDuzenlenenModuller(d.moduller || []);
    setDuzenlenenId(k.id);
  }

  function duzenlenenToggle(anahtar) {
    setDuzenlenenModuller((m) => (m.includes(anahtar) ? m.filter((x) => x !== anahtar) : [...m, anahtar]));
  }

  async function duzenlenenKaydet(id) {
    await fetch(`/api/kodlar/${id}/moduller`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduller: duzenlenenModuller }),
    });
    setDuzenlenenId(null);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && kodlar.length === 0 && <div className="bos-durum">Henüz erişim kodu yok.</div>}
          {!yukleniyor &&
            kodlar.map((k) => (
              <div key={k.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="ogrenci-satir" style={{ borderBottom: "none" }}>
                  <div>
                    <div className="ogrenci-ad">
                      {k.sahip_adi} <span style={{ fontWeight: 400, color: "var(--metin-soluk)" }}>· {k.kod}</span>
                    </div>
                    <div className="ogrenci-detay">
                      {k.admin ? "Admin (her yeri ve yönetimi görür)" : "Sınırlı erişim (sadece izinli modüller)"}
                      {k.son_giris && <> · son giriş {new Date(k.son_giris).toLocaleDateString("tr-TR")}</>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`rozet ${k.aktif ? "rozet-yesil" : "rozet-gri"}`}>{k.aktif ? "Aktif" : "Pasif"}</span>
                    {!k.admin && (
                      <button className="btn btn-hayalet btn-sm" onClick={() => duzenlemeyiAc(k)}>
                        {duzenlenenId === k.id ? "Kapat" : "Modülleri düzenle"}
                      </button>
                    )}
                    <button className="btn btn-hayalet btn-sm" onClick={() => aktifligiDegistir(k)}>
                      {k.aktif ? "Devre dışı bırak" : "Etkinleştir"}
                    </button>
                    <button className="btn btn-tehlike btn-sm" onClick={() => sil(k.id)}>
                      Sil
                    </button>
                  </div>
                </div>
                {duzenlenenId === k.id && (
                  <div style={{ padding: "0 4px 16px" }}>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                      {MODULLER.map((m) => (
                        <label key={m.anahtar} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={duzenlenenModuller.includes(m.anahtar)}
                            onChange={() => duzenlenenToggle(m.anahtar)}
                          />
                          {m.isim}
                        </label>
                      ))}
                    </div>
                    <button className="btn btn-lacivert btn-sm" onClick={() => duzenlenenKaydet(k.id)}>
                      Kaydet
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="kart" style={{ alignSelf: "start" }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Yeni erişim kodu</h3>
          <form onSubmit={ekle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="etiket">Kimin için</label>
              <input
                className="girdi"
                value={form.sahip_adi}
                onChange={(e) => setForm({ ...form, sahip_adi: e.target.value })}
                placeholder="Örn. Rehber Abi - Bilal"
              />
            </div>
            <div>
              <label className="etiket">Kod</label>
              <input
                className="girdi"
                value={form.kod}
                onChange={(e) => setForm({ ...form, kod: e.target.value })}
                placeholder="Örn. YT8271"
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={form.admin} onChange={(e) => setForm({ ...form, admin: e.target.checked })} />
              Admin (her modülü ve Yönetim sayfasını görsün)
            </label>
            {!form.admin && (
              <div>
                <label className="etiket">Hangi modülleri görebilsin</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {MODULLER.map((m) => (
                    <label key={m.anahtar} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                      <input type="checkbox" checked={form.moduller.includes(m.anahtar)} onChange={() => formModulToggle(m.anahtar)} />
                      {m.isim}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {hata && <div className="hata">{hata}</div>}
            <button className="btn btn-lacivert btn-blok" disabled={ekleniyor}>
              {ekleniyor ? "Ekleniyor..." : "Oluştur"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ================= GRUPLAR ================= */
function GruplarPaneli() {
  const [gruplar, setGruplar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yeniIsim, setYeniIsim] = useState("");
  const [ekleniyor, setEkleniyor] = useState(false);

  const getir = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/gruplar")
      .then((r) => r.json())
      .then((d) => {
        setGruplar(d.gruplar || []);
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => getir(), [getir]);

  async function bilgilendirmeyiDegistir(g) {
    await fetch("/api/gruplar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, veli_bilgilendirme_aktif: !g.veli_bilgilendirme_aktif }),
    });
    getir();
  }

  async function grupEkle(e) {
    e.preventDefault();
    if (!yeniIsim.trim()) return;
    setEkleniyor(true);
    await fetch("/api/gruplar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: yeniIsim, siralama: gruplar.length + 1 }),
    });
    setYeniIsim("");
    setEkleniyor(false);
    getir();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor &&
            gruplar.map((g) => (
              <div className="ogrenci-satir" key={g.id}>
                <div>
                  <div className="ogrenci-ad">{g.isim}</div>
                  <div className="ogrenci-detay">
                    {g.veli_bilgilendirme_aktif
                      ? "Veli Bilgilendirme sayfasında görünür"
                      : "Veli Bilgilendirme sayfasında gizli — bu gruba mesaj gönderilmez"}
                  </div>
                </div>
                <button className={`btn btn-sm ${g.veli_bilgilendirme_aktif ? "btn-tehlike" : "btn-yesil"}`} onClick={() => bilgilendirmeyiDegistir(g)}>
                  {g.veli_bilgilendirme_aktif ? "Mesajı kapat" : "Mesajı aç"}
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="kart" style={{ alignSelf: "start" }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Yeni grup ekle</h3>
          <form onSubmit={grupEkle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="etiket">Grup adı</label>
              <input className="girdi" value={yeniIsim} onChange={(e) => setYeniIsim(e.target.value)} placeholder="Örn. Hazırlık" />
            </div>
            <button className="btn btn-lacivert btn-blok" disabled={ekleniyor}>
              {ekleniyor ? "Ekleniyor..." : "Ekle"}
            </button>
          </form>
          <div className="uyari" style={{ marginTop: 18 }}>
            WhatsApp'ı tamamen otomatik (tek tuşla, tıklamadan) toplu göndermek isterseniz, Meta WhatsApp
            Business Cloud API için işletme hesabı başvurusu gerekir. Şu anki sistem her veli için hazır
            mesajlı bağlantı üretir, gönder'e siz basarsınız.
          </div>
        </div>
      </div>
    </div>
  );
}

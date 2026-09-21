"use client";
import { useEffect, useState, useCallback } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function whatsappNumarasi(tel) {
  if (!tel) return null;
  let t = tel.replace(/[^0-9]/g, ""); // sadece rakamlar
  if (t.startsWith("90")) return t; // zaten uluslararası: 905321234567
  if (t.startsWith("0")) return "90" + t.slice(1); // 05321234567 -> 905321234567
  if (t.length === 10) return "90" + t; // 5321234567 -> 905321234567
  return t;
}

const KAYNAKLAR = [
  { anahtar: "yoklama", isim: "Yurt Yoklama" },
  { anahtar: "namaz", isim: "Namaz Yoklama" },
];

const VAKIT_ETIKET = { sabah: "Sabah", ogle: "Öğle", ikindi: "İkindi", aksam: "Akşam", yatsi: "Yatsı" };
const VAKIT_SIRA = ["sabah", "ogle", "ikindi", "aksam", "yatsi"];
const NAMAZ_DURUM_ETIKET = { kildi: "Kıldı", gec_kildi: "Geç Kıldı", kilmadi: "Kılmadı" };

const VARSAYILAN_SABLON_YOKLAMA =
  "Sayın {veli}, {ogrenci} adlı öğrencimizin {tarih} tarihli {tur} durumu: {durum}. Bilginize sunarız. Yavuztürk Süleymaniye Yurdu";
const VARSAYILAN_SABLON_NAMAZ =
  "Sayın {veli}, {ogrenci} adlı öğrencimizin {tarih} tarihli namaz durumu: {durum}. Bilginize sunarız. Yavuztürk Süleymaniye Yurdu";

export default function MesajIstemci({ baslangicGruplar, baslangicTurler }) {
  const [kaynak, setKaynak] = useState("yoklama");
  const [gruplar] = useState(baslangicGruplar || []);
  const [grupId, setGrupId] = useState(baslangicGruplar?.[0]?.id || null);
  const [turler] = useState(baslangicTurler || []);
  const [turId, setTurId] = useState(baslangicTurler?.[0]?.id || null);
  const [tarih, setTarih] = useState(bugun());
  const [durumFiltre, setDurumFiltre] = useState("izinsiz");
  const [sablon, setSablon] = useState(VARSAYILAN_SABLON_YOKLAMA);
  const [sablonElleDegisti, setSablonElleDegisti] = useState(false);
  const [ogrenciler, setOgrenciler] = useState([]);
  const [kayitMap, setKayitMap] = useState({}); // yoklama: ogrenci_id -> kayit | namaz: ogrenci_id -> [kayitlar]
  const [yukleniyor, setYukleniyor] = useState(true);

  // Kaynak değişince filtre ve şablonu o kaynağa uygun varsayılana çek
  useEffect(() => {
    setDurumFiltre(kaynak === "namaz" ? "kilmadi" : "izinsiz");
    if (!sablonElleDegisti) setSablon(kaynak === "namaz" ? VARSAYILAN_SABLON_NAMAZ : VARSAYILAN_SABLON_YOKLAMA);
  }, [kaynak]); // eslint-disable-line react-hooks/exhaustive-deps

  const getir = useCallback(() => {
    if (!grupId) return;
    if (kaynak === "yoklama" && !turId) return;
    setYukleniyor(true);
    if (kaynak === "namaz") {
      fetch(`/api/namaz-yoklama?grup_id=${grupId}&tarih=${tarih}`)
        .then((r) => r.json())
        .then((d) => {
          setOgrenciler(d.ogrenciler || []);
          const map = {};
          (d.kayitlar || []).forEach((k) => {
            if (!map[k.ogrenci_id]) map[k.ogrenci_id] = [];
            map[k.ogrenci_id].push(k);
          });
          setKayitMap(map);
          setYukleniyor(false);
        });
    } else {
      fetch(`/api/yoklama?grup_id=${grupId}&tarih=${tarih}&tur_id=${turId}`)
        .then((r) => r.json())
        .then((d) => {
          setOgrenciler(d.ogrenciler || []);
          const map = {};
          (d.kayitlar || []).forEach((k) => (map[k.ogrenci_id] = k));
          setKayitMap(map);
          setYukleniyor(false);
        });
    }
  }, [kaynak, grupId, turId, tarih]);

  useEffect(() => getir(), [getir]);

  const seciliGrup = gruplar.find((g) => g.id === grupId);
  const grupKapali = seciliGrup && seciliGrup.veli_bilgilendirme_aktif === false;
  const seciliTur = turler.find((t) => t.id === turId);

  const durumEtiketYoklama = { geldi: "Geldi", izinli: "İzinli", izinsiz: "İzinsiz" };

  function namazOzeti(kayitlar) {
    if (!kayitlar || kayitlar.length === 0) return "İşaretlenmedi";
    return VAKIT_SIRA.filter((v) => kayitlar.some((k) => k.vakit === v))
      .map((v) => {
        const k = kayitlar.find((kk) => kk.vakit === v);
        return `${VAKIT_ETIKET[v]}: ${NAMAZ_DURUM_ETIKET[k.durum] || k.durum}`;
      })
      .join(", ");
  }

  const hedefListe = ogrenciler
    .filter((o) => o.veli_telefon)
    .map((o) => ({ ogrenci: o, kayit: kayitMap[o.id] }))
    .filter(({ kayit }) => {
      if (kaynak === "namaz") {
        const kayitlar = kayit || [];
        if (durumFiltre === "hepsi") return kayitlar.length > 0;
        return kayitlar.some((k) => k.durum === durumFiltre);
      }
      if (durumFiltre === "hepsi") return true;
      return kayit?.durum === durumFiltre;
    });

  function mesajUret(ogrenci, kayit) {
    const durumMetni = kaynak === "namaz" ? namazOzeti(kayit) : kayit ? durumEtiketYoklama[kayit.durum] : "İşaretlenmedi";
    return sablon
      .replaceAll("{veli}", ogrenci.veli_adi || "Veli")
      .replaceAll("{ogrenci}", ogrenci.ad_soyad)
      .replaceAll("{tarih}", tarih.split("-").reverse().join("."))
      .replaceAll("{tur}", seciliTur?.isim || "yoklama")
      .replaceAll("{durum}", durumMetni);
  }

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Veli Bilgilendirme</h1>
      </div>
      <p className="sayfa-alt">
        Önce hangi konuda mesaj göndereceğinizi seçin. Her veli için hazır mesajla WhatsApp'ı açan bir bağlantı üretir;
        gönder'e siz basarsınız.
      </p>

      <div className="grup-sekme">
        {KAYNAKLAR.map((k) => (
          <button key={k.anahtar} className={kaynak === k.anahtar ? "aktif" : ""} onClick={() => setKaynak(k.anahtar)}>
            {k.isim}
          </button>
        ))}
      </div>

      {kaynak === "yoklama" && turler.length > 1 && (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Hangi yoklama türü</label>
          <div className="grup-sekme">
            {turler.map((t) => (
              <button key={t.id} className={turId === t.id ? "aktif" : ""} onClick={() => setTurId(t.id)}>
                {t.isim}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="grup-sekme">
        {gruplar.map((g) => (
          <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
            {g.isim} {g.veli_bilgilendirme_aktif === false && "🔕"}
          </button>
        ))}
      </div>

      {grupKapali ? (
        <div className="uyari">
          {seciliGrup.isim} grubu için veli bilgilendirmesi Yönetim sayfasından kapatılmış. Açmak için Yönetim →
          Gruplar bölümüne gidin.
        </div>
      ) : (
        <>
          <div className="kart" style={{ marginBottom: 20 }}>
            <div className="kart-ic">
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <label className="etiket">Tarih</label>
                  <input type="date" className="girdi" value={tarih} onChange={(e) => setTarih(e.target.value)} max={bugun()} />
                </div>
                <div>
                  <label className="etiket">Kimlere gönderilsin</label>
                  {kaynak === "namaz" ? (
                    <select className="girdi" value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}>
                      <option value="kilmadi">En az bir vakti kılmayanlar</option>
                      <option value="gec_kildi">Geç kılanı olanlar</option>
                      <option value="hepsi">Bugün işaretlenen herkes</option>
                    </select>
                  ) : (
                    <select className="girdi" value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}>
                      <option value="izinsiz">Sadece izinsiz olanlar</option>
                      <option value="izinli">Sadece izinli olanlar</option>
                      <option value="geldi">Sadece gelenler</option>
                      <option value="hepsi">Bugün işaretlenen herkes</option>
                    </select>
                  )}
                </div>
              </div>
              <label className="etiket">Mesaj şablonu</label>
              <textarea
                className="girdi"
                rows={3}
                value={sablon}
                onChange={(e) => {
                  setSablon(e.target.value);
                  setSablonElleDegisti(true);
                }}
              />
              <div style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginTop: 6 }}>
                Kullanabileceğiniz alanlar: {"{veli}"}, {"{ogrenci}"}, {"{tarih}"}, {"{durum}"}
                {kaynak === "yoklama" && <> , {"{tur}"}</>}
              </div>
            </div>
          </div>

          <div className="kart">
            <div className="kart-ic">
              {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
              {!yukleniyor && hedefListe.length === 0 && (
                <div className="bos-durum">Bu filtreye uyan, telefonu kayıtlı öğrenci yok.</div>
              )}
              {!yukleniyor &&
                hedefListe.map(({ ogrenci, kayit }) => {
                  const numara = whatsappNumarasi(ogrenci.veli_telefon);
                  const metin = mesajUret(ogrenci, kayit);
                  const link = numara ? `https://wa.me/${numara}?text=${encodeURIComponent(metin)}` : null;
                  return (
                    <div className="ogrenci-satir" key={ogrenci.id}>
                      <div>
                        <div className="ogrenci-ad">{ogrenci.ad_soyad}</div>
                        <div className="ogrenci-detay">
                          {ogrenci.veli_adi || "Veli"} · {ogrenci.veli_telefon}
                        </div>
                      </div>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-yesil btn-sm">
                        WhatsApp'ta gönder
                      </a>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

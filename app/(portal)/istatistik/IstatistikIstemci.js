"use client";
import { useEffect, useState, useCallback } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function ayBasi() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
}

const KAYNAKLAR = [
  { anahtar: "yoklama", isim: "Yurt Yoklama" },
  { anahtar: "namaz", isim: "Namaz Yoklama" },
  { anahtar: "gorev", isim: "Görev Listeleri" },
];

export default function IstatistikIstemci({ baslangicGruplar, baslangicTurler, baslangicListeler }) {
  const [kaynak, setKaynak] = useState("yoklama");

  const [turler] = useState(baslangicTurler || []);
  const [turId, setTurId] = useState(baslangicTurler?.[0]?.id || null);

  const [gruplar] = useState(baslangicGruplar || []);
  const [grupId, setGrupId] = useState(baslangicGruplar?.[0]?.id || null);

  const [listeler] = useState(baslangicListeler || []);
  const [listeId, setListeId] = useState(baslangicListeler?.[0]?.id || null);

  const [baslangic, setBaslangic] = useState(ayBasi());
  const [bitis, setBitis] = useState(bugun());
  const [sonuc, setSonuc] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kisiAra, setKisiAra] = useState("");

  const getir = useCallback(() => {
    if (kaynak === "gorev") {
      if (!listeId) return;
      setYukleniyor(true);
      const params = new URLSearchParams({ kaynak, liste_id: listeId, baslangic, bitis });
      fetch(`/api/istatistik?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          setSonuc(d.sonuc || []);
          setYukleniyor(false);
        });
      return;
    }
    if (!grupId) return;
    if (kaynak === "yoklama" && !turId) return;
    setYukleniyor(true);
    const params = new URLSearchParams({ kaynak, grup_id: grupId, baslangic, bitis });
    if (kaynak === "yoklama") params.set("tur_id", turId);
    fetch(`/api/istatistik?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setSonuc(d.sonuc || []);
        setYukleniyor(false);
      });
  }, [kaynak, grupId, turId, listeId, baslangic, bitis]);

  useEffect(() => getir(), [getir]);

  const genelToplam = sonuc.reduce((a, s) => a + s.toplam, 0);
  const genelGeldi = sonuc.reduce((a, s) => a + s.geldi, 0);
  const genelOran = genelToplam ? Math.round((genelGeldi / genelToplam) * 100) : null;

  const basliklar =
    kaynak === "namaz"
      ? { ilk: "Kıldı", ikinci: "Geç Kıldı", ucuncu: "Kılmadı", oranEtiket: "Kılma oranı" }
      : kaynak === "gorev"
      ? { ilk: "Vazifeli olduğu gün", ikinci: null, ucuncu: null, oranEtiket: "Aralığın yüzdesi" }
      : { ilk: "Geldi", ikinci: "İzinli", ucuncu: "İzinsiz", oranEtiket: "Devam oranı" };

  const gosterilenSonuc = kisiAra.trim()
    ? sonuc.filter((s) => s.ogrenci.ad_soyad.toLocaleLowerCase("tr").includes(kisiAra.trim().toLocaleLowerCase("tr")))
    : sonuc;

  return (
    <>
      <div className="sayfa-baslik">
        <h1>İstatistik</h1>
      </div>
      <p className="sayfa-alt">Neyin istatistiğini görmek istediğinizi seçin, sonra tarih aralığını daraltın.</p>

      <div className="grup-sekme">
        {KAYNAKLAR.map((k) => (
          <button key={k.anahtar} className={kaynak === k.anahtar ? "aktif" : ""} onClick={() => setKaynak(k.anahtar)}>
            {k.isim}
          </button>
        ))}
      </div>

      {kaynak === "yoklama" && turler.length > 1 && (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Yoklama türü</label>
          <div className="grup-sekme">
            {turler.map((t) => (
              <button key={t.id} className={turId === t.id ? "aktif" : ""} onClick={() => setTurId(t.id)}>
                {t.isim}
              </button>
            ))}
          </div>
        </>
      )}

      {kaynak === "gorev" ? (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Hangi görev listesi</label>
          <div className="grup-sekme">
            {listeler.map((l) => (
              <button key={l.id} className={listeId === l.id ? "aktif" : ""} onClick={() => setListeId(l.id)}>
                {l.isim}
              </button>
            ))}
            {listeler.length === 0 && <span className="bos-durum">Henüz görev listesi yok.</span>}
          </div>
        </>
      ) : (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Grup</label>
          <div className="grup-sekme">
            {gruplar.map((g) => (
              <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
                {g.isim}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="kart" style={{ marginBottom: 20 }}>
        <div className="kart-ic" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="etiket">Başlangıç</label>
            <input type="date" className="girdi" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
          </div>
          <div>
            <label className="etiket">Bitiş</label>
            <input type="date" className="girdi" value={bitis} max={bugun()} onChange={(e) => setBitis(e.target.value)} />
          </div>
          {genelOran !== null && (
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "var(--metin-soluk)" }}>Genel {basliklar.oranEtiket.toLocaleLowerCase("tr")}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--lacivert)" }}>%{genelOran}</div>
            </div>
          )}
        </div>
      </div>

      {sonuc.length > 3 && (
        <input
          className="girdi"
          style={{ marginBottom: 14, maxWidth: 280 }}
          placeholder="Kişi ara..."
          value={kisiAra}
          onChange={(e) => setKisiAra(e.target.value)}
        />
      )}

      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && sonuc.length === 0 && (
            <div className="bos-durum">{kaynak === "gorev" ? "Bu listede kişi yok." : "Bu grupta öğrenci yok."}</div>
          )}
          {!yukleniyor && sonuc.length > 0 && gosterilenSonuc.length === 0 && (
            <div className="bos-durum">"{kisiAra}" ile eşleşen kimse yok.</div>
          )}
          {!yukleniyor && gosterilenSonuc.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>{kaynak === "gorev" ? "Kişi" : "Öğrenci"}</th>
                  <th>{basliklar.ilk}</th>
                  {basliklar.ikinci && <th>{basliklar.ikinci}</th>}
                  {basliklar.ucuncu && <th>{basliklar.ucuncu}</th>}
                  <th style={{ width: 160 }}>{basliklar.oranEtiket}</th>
                </tr>
              </thead>
              <tbody>
                {gosterilenSonuc.map((s) => (
                  <tr key={s.ogrenci.id}>
                    <td style={{ fontWeight: 600 }}>{s.ogrenci.ad_soyad}</td>
                    <td>{s.geldi}</td>
                    {basliklar.ikinci && <td>{s.izinli}</td>}
                    {basliklar.ucuncu && <td>{s.izinsiz}</td>}
                    <td>
                      {s.oran === null ? (
                        <span style={{ color: "var(--metin-soluk)" }}>Kayıt yok</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="istatistik-cubuk-sarma" style={{ flex: 1 }}>
                            <div className="istatistik-cubuk" style={{ width: `${s.oran}%` }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, width: 34 }}>%{s.oran}</span>
                        </div>
                      )}
                    </td>
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

"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function saatFormatla(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function tarihFormatla(d) {
  return `${GUNLER[d.getDay()]}, ${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
}

export default function SunumIstemci({ ilkVeri }) {
  const [veri, setVeri] = useState(ilkVeri);
  const [saat, setSaat] = useState(null);
  const [tamEkran, setTamEkran] = useState(false);
  const sarmalRef = useRef(null);

  const yenile = useCallback(() => {
    fetch("/api/sunum")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setVeri(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSaat(new Date());
    const zamanlayici = setInterval(() => setSaat(new Date()), 1000 * 30);
    const yenileZamanlayici = setInterval(yenile, 45_000);
    return () => {
      clearInterval(zamanlayici);
      clearInterval(yenileZamanlayici);
    };
  }, [yenile]);

  function tamEkraniDegistir() {
    if (!document.fullscreenElement) {
      sarmalRef.current?.requestFullscreen?.().then(() => setTamEkran(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setTamEkran(false)).catch(() => {});
    }
  }

  const yoklamaOran = veri.yoklama && veri.yoklama.toplamIsaretlenen > veri.yoklama.izinli
    ? Math.round((veri.yoklama.geldi / (veri.yoklama.toplamIsaretlenen - veri.yoklama.izinli || 1)) * 100)
    : null;
  const namazOran = veri.namaz && veri.namaz.toplamIsaretlenen > veri.namaz.izinli
    ? Math.round(((veri.namaz.kildi + veri.namaz.gecKildi) / (veri.namaz.toplamIsaretlenen - veri.namaz.izinli || 1)) * 100)
    : null;

  return (
    <div className="sunum-sayfa" ref={sarmalRef}>
      <div className="sunum-ust">
        <div className="sunum-org">
          <img src="/logo.png" alt="Yavuztürk Süleymaniye" />
          <div className="sunum-org-metin">Yavuztürk Süleymaniye</div>
        </div>
        <div className="sunum-saat-blok">
          <div className="sunum-tarih">{saat ? tarihFormatla(saat) : ""}</div>
          <div className="sunum-saat">{saat ? saatFormatla(saat) : "--:--"}</div>
          <div className="sunum-kontroller">
            <button className="sunum-kontrol-btn" onClick={tamEkraniDegistir}>
              {tamEkran ? "⤡ Tam Ekrandan Çık" : "⤢ Tam Ekran"}
            </button>
            <Link href="/" className="sunum-kontrol-btn" style={{ textDecoration: "none" }}>
              ✕ Çıkış
            </Link>
          </div>
        </div>
      </div>

      <div className="sunum-bolum-baslik">Bugün — Toplam {veri.toplamOgrenci} Öğrenci</div>

      {veri.yoklama && (
        <>
          <div className="sunum-bolum-baslik">Yoklama</div>
          <div className="sunum-izgara">
            <div className="sunum-kart">
              <div className="sunum-kart-sayi" style={{ color: "#7fd9a8" }}>{veri.yoklama.geldi}</div>
              <div className="sunum-kart-etiket">Geldi</div>
            </div>
            <div className="sunum-kart">
              <div className="sunum-kart-sayi" style={{ color: "#e3b972" }}>{veri.yoklama.izinli}</div>
              <div className="sunum-kart-etiket">İzinli</div>
            </div>
            <div className="sunum-kart">
              <div className="sunum-kart-sayi" style={{ color: "#e0776f" }}>{veri.yoklama.izinsiz}</div>
              <div className="sunum-kart-etiket">İzinsiz</div>
            </div>
            {yoklamaOran !== null && (
              <div className="sunum-kart">
                <div className="sunum-kart-sayi">%{yoklamaOran}</div>
                <div className="sunum-kart-etiket">Devam Oranı</div>
              </div>
            )}
          </div>
        </>
      )}

      {veri.namaz && (
        <>
          <div className="sunum-bolum-baslik">Namaz Yoklama</div>
          <div className="sunum-izgara">
            <div className="sunum-kart">
              <div className="sunum-kart-sayi" style={{ color: "#7fd9a8" }}>{veri.namaz.kildi}</div>
              <div className="sunum-kart-etiket">Kıldı</div>
            </div>
            <div className="sunum-kart">
              <div className="sunum-kart-sayi" style={{ color: "#e3b972" }}>{veri.namaz.gecKildi}</div>
              <div className="sunum-kart-etiket">Geç Kıldı</div>
            </div>
            <div className="sunum-kart">
              <div className="sunum-kart-sayi" style={{ color: "#6fb3d1" }}>{veri.namaz.izinli}</div>
              <div className="sunum-kart-etiket">İzinli</div>
            </div>
            <div className="sunum-kart">
              <div className="sunum-kart-sayi" style={{ color: "#e0776f" }}>{veri.namaz.kilmadi}</div>
              <div className="sunum-kart-etiket">Kılmadı</div>
            </div>
            {namazOran !== null && (
              <div className="sunum-kart">
                <div className="sunum-kart-sayi">%{namazOran}</div>
                <div className="sunum-kart-etiket">Kılma Oranı</div>
              </div>
            )}
          </div>
        </>
      )}

      {veri.vazifeler.length > 0 && (
        <>
          <div className="sunum-bolum-baslik">Bugünün Vazifeleri</div>
          <div className="sunum-vazife-izgara">
            {veri.vazifeler.map((v) => (
              <div className="sunum-vazife-kart" key={v.liste}>
                <div className="sunum-vazife-liste">{v.liste}</div>
                <div className="sunum-vazife-kisi">{v.kisi}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!veri.yoklama && !veri.namaz && veri.vazifeler.length === 0 && (
        <div className="sunum-bos">Gösterilecek modül verisi yok.</div>
      )}

      <div className="sunum-canli">
        <span className="sunum-canli-nokta" /> Canlı — her 45 saniyede güncellenir
      </div>
    </div>
  );
}

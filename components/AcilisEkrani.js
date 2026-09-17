"use client";
import { useEffect, useState } from "react";

// Sayfa ilk açıldığında lacivert zemin üzerinde logo belirir, kısa bir
// süre durur, sonra yumuşakça kaybolup asıl içeriği açığa çıkarır.
export default function AcilisEkrani({ children }) {
  const [asama, setAsama] = useState("giris"); // giris -> bekle -> cikis -> bitti

  useEffect(() => {
    let gorulduMu = false;
    try {
      gorulduMu = sessionStorage.getItem("ys_acilis_gorundu") === "1";
    } catch {}

    if (gorulduMu) {
      setAsama("bitti");
      return;
    }

    const t1 = setTimeout(() => setAsama("bekle"), 120);
    const t2 = setTimeout(() => setAsama("cikis"), 1100);
    const t3 = setTimeout(() => {
      setAsama("bitti");
      try {
        sessionStorage.setItem("ys_acilis_gorundu", "1");
      } catch {}
    }, 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <>
      {asama !== "bitti" && (
        <div className={`acilis-ekrani ${asama === "cikis" ? "acilis-cikis" : ""}`}>
          <img
            src="/logo.png"
            alt="Yavuztürk Süleymaniye"
            className={`acilis-logo ${asama === "giris" ? "acilis-logo-baslangic" : "acilis-logo-goster"}`}
          />
          <div className="serit acilis-serit" />
        </div>
      )}
      {children}
    </>
  );
}

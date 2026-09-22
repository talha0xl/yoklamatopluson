"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CikisButonu from "./CikisButonu";
import TemaDugmesi from "./TemaDugmesi";

export default function KabukNav({ modulLinkleri, istatistikVarMi, mesajVarMi, isAdmin, sahipAdi }) {
  const yol = usePathname();

  return (
    <aside className="yan-menu">
      <div className="logo-alan">
        <Link href="/">
          <img src="/logo.png" alt="Yavuztürk Süleymaniye" />
        </Link>
      </div>
      <nav>
        <Link href="/" className={yol === "/" ? "aktif" : ""}>
          Ana Sayfa
        </Link>
        {modulLinkleri.map((m) => (
          <Link key={m.href} href={m.href} className={yol === m.href || yol.startsWith(m.href + "/") ? "aktif" : ""}>
            {m.etiket}
            {m.altYazi ? <span className="menu-rozet">{m.altYazi}</span> : null}
          </Link>
        ))}
        {istatistikVarMi && (
          <Link href="/istatistik" className={yol === "/istatistik" ? "aktif" : ""}>
            İstatistik
          </Link>
        )}
        {mesajVarMi && (
          <Link href="/mesaj" className={yol === "/mesaj" ? "aktif" : ""}>
            Veli Bilgilendirme
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin" className={yol === "/admin" ? "aktif" : ""}>
            Yönetim
          </Link>
        )}
      </nav>
      <TemaDugmesi />
      <CikisButonu />
      <div className="alt-bilgi">{sahipAdi ? <>Giriş: {sahipAdi}</> : null}</div>
    </aside>
  );
}

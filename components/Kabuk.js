import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession } from "../lib/session";
import { MODULLER, modulErisimVarMi } from "../lib/moduller";
import CikisButonu from "./CikisButonu";

export default async function Kabuk({ aktif, children }) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  const modulLinkleri = MODULLER.filter(
    (m) => (m.hazir || session?.admin) && modulErisimVarMi(session, m.anahtar)
  ).map((m) => ({ href: m.yol, etiket: m.isim, altYazi: m.hazir ? null : "yapım aşamasında" }));

  const duzYoklamaVarMi = modulErisimVarMi(session, "duz_yoklama");

  return (
    <div className="kabuk">
      <aside className="yan-menu">
        <div className="logo-alan">
          <Link href="/">
            <img src="/logo.png" alt="Yavuztürk Süleymaniye" />
          </Link>
        </div>
        <nav>
          <Link href="/" className={aktif === "/" ? "aktif" : ""}>
            Ana Sayfa
          </Link>
          {modulLinkleri.map((m) => (
            <Link key={m.href} href={m.href} className={aktif === m.href ? "aktif" : ""}>
              {m.etiket}
              {m.altYazi ? <span className="menu-rozet">{m.altYazi}</span> : null}
            </Link>
          ))}
          {duzYoklamaVarMi && (
            <>
              <Link href="/istatistik" className={aktif === "/istatistik" ? "aktif" : ""}>
                İstatistik
              </Link>
              <Link href="/mesaj" className={aktif === "/mesaj" ? "aktif" : ""}>
                Veli Bilgilendirme
              </Link>
            </>
          )}
          {session?.admin && (
            <Link href="/admin" className={aktif === "/admin" ? "aktif" : ""}>
              Yönetim
            </Link>
          )}
        </nav>
        <CikisButonu />
        <div className="alt-bilgi">
          {session?.sahip_adi ? <>Giriş: {session.sahip_adi}</> : null}
        </div>
      </aside>
      <div className="icerik">
        <div className="sayfa">{children}</div>
      </div>
    </div>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "../lib/session";
import { MODULLER, modulErisimVarMi } from "../lib/moduller";
import Kabuk from "../components/Kabuk";

export default async function Anasayfa() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) redirect("/login");

  const gorulebilirModuller = MODULLER.filter(
    (m) => (m.hazir || session.admin) && modulErisimVarMi(session, m.anahtar)
  );

  return (
    <Kabuk aktif="/">
      <div className="sayfa-baslik">
        <h1>Hoş geldiniz{session.sahip_adi ? `, ${session.sahip_adi}` : ""}</h1>
      </div>
      <p className="sayfa-alt">Devam etmek istediğiniz modülü seçin.</p>

      <div className="modul-izgara">
        {gorulebilirModuller.map((m) => {
          const pasif = !m.hazir;
          const Etiket = pasif ? "div" : "a";
          return (
            <Etiket key={m.anahtar} href={pasif ? undefined : m.yol} className={`modul-kart ${pasif ? "modul-pasif" : ""}`}>
              <div className="modul-simge">
                <ModulSimgesi anahtar={m.anahtar} />
              </div>
              <div className="modul-baslik">
                {m.isim}
                {pasif && <span className="rozet rozet-gri">Yapım aşamasında</span>}
              </div>
              <div className="modul-aciklama">{m.aciklama}</div>
            </Etiket>
          );
        })}
        {gorulebilirModuller.length === 0 && (
          <div className="bos-durum">
            Henüz erişiminiz olan bir modül yok. Yöneticinizle iletişime geçin.
          </div>
        )}
      </div>
    </Kabuk>
  );
}

function ModulSimgesi({ anahtar }) {
  const stil = { width: 22, height: 22, stroke: "var(--lacivert)", fill: "none", strokeWidth: 1.8 };
  if (anahtar === "duz_yoklama")
    return (
      <svg viewBox="0 0 24 24" style={stil}>
        <path d="M4 12l4 4L20 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (anahtar === "namaz_yoklama")
    return (
      <svg viewBox="0 0 24 24" style={stil}>
        <path d="M12 3v6M12 21c-4-2-7-5-7-9a7 7 0 0114 0c0 4-3 7-7 9z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (anahtar === "gorev_listeleri")
    return (
      <svg viewBox="0 0 24 24" style={stil}>
        <path d="M5 6h14M5 12h14M5 18h9" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" style={stil}>
      <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5zM20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z" strokeLinejoin="round" />
    </svg>
  );
}

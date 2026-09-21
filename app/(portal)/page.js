import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "../../lib/session";
import { MODULLER, modulErisimVarMi } from "../../lib/moduller";
import { supabaseServer } from "../../lib/supabaseServer";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

async function ozetVerileriGetir(session) {
  const supabase = supabaseServer();
  const tarih = bugun();
  const ozet = { yoklama: null, namaz: null, gorev: null };

  try {
    if (modulErisimVarMi(session, "duz_yoklama")) {
      const { count: toplamOgrenci } = await supabase
        .from("ogrenciler")
        .select("id", { count: "exact", head: true })
        .eq("aktif", true);
      const { data: tur } = await supabase
        .from("yoklama_turleri")
        .select("id")
        .eq("isim", "Günlük Yoklama")
        .maybeSingle();
      if (tur && toplamOgrenci) {
        const { count: geldi } = await supabase
          .from("yoklama")
          .select("id", { count: "exact", head: true })
          .eq("tarih", tarih)
          .eq("tur_id", tur.id)
          .eq("durum", "geldi");
        ozet.yoklama = { geldi: geldi || 0, toplam: toplamOgrenci };
      }
    }
  } catch {}

  try {
    if (modulErisimVarMi(session, "namaz_yoklama")) {
      const { count: toplamOgrenci } = await supabase
        .from("ogrenciler")
        .select("id", { count: "exact", head: true })
        .eq("aktif", true);
      if (toplamOgrenci) {
        const { count: kildi } = await supabase
          .from("namaz_yoklama")
          .select("id", { count: "exact", head: true })
          .eq("tarih", tarih)
          .in("durum", ["kildi", "gec_kildi"]);
        ozet.namaz = { kildi: kildi || 0, toplamMumkun: toplamOgrenci * 5 };
      }
    }
  } catch {}

  try {
    if (modulErisimVarMi(session, "gorev_listeleri")) {
      const { count: toplamKisi } = await supabase
        .from("gorev_kisileri")
        .select("id", { count: "exact", head: true })
        .eq("aktif", true);
      const { count: yapildi } = await supabase
        .from("gorev_kayitlari")
        .select("id", { count: "exact", head: true })
        .eq("tarih", tarih)
        .eq("yapildi", true);
      if (toplamKisi) ozet.gorev = { yapildi: yapildi || 0, toplam: toplamKisi };
    }
  } catch {}

  return ozet;
}

export default async function Anasayfa() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) redirect("/login");

  const gorulebilirModuller = MODULLER.filter(
    (m) => (m.hazir || session.admin) && modulErisimVarMi(session, m.anahtar)
  );
  const ozet = await ozetVerileriGetir(session);
  const ozetVarMi = ozet.yoklama || ozet.namaz || ozet.gorev;

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Hoş geldiniz{session.sahip_adi ? `, ${session.sahip_adi}` : ""}</h1>
      </div>
      <p className="sayfa-alt">Devam etmek istediğiniz modülü seçin.</p>

      <div className="modul-izgara">
        {gorulebilirModuller.map((m) => {
          const pasif = !m.hazir;
          return (
            <ModulKart key={m.anahtar} modul={m} pasif={pasif} />
          );
        })}
        {gorulebilirModuller.length === 0 && (
          <div className="bos-durum">
            Henüz erişiminiz olan bir modül yok. Yöneticinizle iletişime geçin.
          </div>
        )}
      </div>

      {ozetVarMi && (
        <>
          <div className="ozet-baslik">Bugünün özeti</div>
          <div className="ozet-izgara">
            {ozet.yoklama && (
              <OzetKart
                deger={`${ozet.yoklama.geldi} / ${ozet.yoklama.toplam}`}
                etiket="Bugün Yurt Yoklama'da geldi"
                oran={ozet.yoklama.toplam ? Math.round((ozet.yoklama.geldi / ozet.yoklama.toplam) * 100) : 0}
              />
            )}
            {ozet.namaz && (
              <OzetKart
                deger={`%${ozet.namaz.toplamMumkun ? Math.round((ozet.namaz.kildi / ozet.namaz.toplamMumkun) * 100) : 0}`}
                etiket="Bugün namaz tamamlanma oranı"
                oran={ozet.namaz.toplamMumkun ? Math.round((ozet.namaz.kildi / ozet.namaz.toplamMumkun) * 100) : 0}
              />
            )}
            {ozet.gorev && (
              <OzetKart
                deger={`${ozet.gorev.yapildi} / ${ozet.gorev.toplam}`}
                etiket="Bugün görev listelerinde tamamlanan"
                oran={ozet.gorev.toplam ? Math.round((ozet.gorev.yapildi / ozet.gorev.toplam) * 100) : 0}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

function OzetKart({ deger, etiket, oran }) {
  return (
    <div className="ozet-kart">
      <div className="ozet-deger">{deger}</div>
      <div className="ozet-etiket">{etiket}</div>
      <div className="ozet-cubuk-sarma">
        <div className="ozet-cubuk" style={{ width: `${Math.min(100, Math.max(0, oran))}%` }} />
      </div>
    </div>
  );
}

function ModulKart({ modul, pasif }) {
  const icerik = (
    <>
      <div className="modul-simge">
        <ModulSimgesi anahtar={modul.anahtar} />
      </div>
      <div className="modul-baslik">
        {modul.isim}
        {pasif && <span className="rozet rozet-gri">Yapım aşamasında</span>}
      </div>
      <div className="modul-aciklama">{modul.aciklama}</div>
    </>
  );
  if (pasif) {
    return <div className={`modul-kart modul-pasif`}>{icerik}</div>;
  }
  return (
    <Link href={modul.yol} className="modul-kart">
      {icerik}
    </Link>
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

// Merkezi modül kayıt defteri. Ana sayfa, yan menü ve yetki kontrolü
// (middleware) hepsi buradan okur — yeni bir modül eklerken sadece
// buraya bir satır eklemeniz yeterli.
export const MODULLER = [
  {
    anahtar: "duz_yoklama",
    isim: "Yurt Yoklama",
    yol: "/duz-yoklama",
    aciklama: "Günlük yurt yoklaması, istatistik ve veli bilgilendirme.",
    korunan_yollar: ["/duz-yoklama", "/istatistik", "/mesaj"],
    hazir: true,
  },
  {
    anahtar: "namaz_yoklama",
    isim: "Namaz Yoklama",
    yol: "/namaz-yoklama",
    aciklama: "Beş vakit namaz takibi, grup bazlı.",
    korunan_yollar: ["/namaz-yoklama"],
    hazir: true,
  },
  {
    anahtar: "gorev_listeleri",
    isim: "Görev Listeleri",
    yol: "/gorev-listeleri",
    aciklama: "Yemekçilik, müezzinlik, nöbetçi — sıralı görev takibi.",
    korunan_yollar: ["/gorev-listeleri"],
    hazir: true,
  },
  {
    anahtar: "kitap_takip",
    isim: "Kitap Takip",
    yol: "/kitap-takip.html",
    aciklama: "Talebe kitap okuma takibi, kütüphane ve veli WhatsApp bilgilendirmesi.",
    korunan_yollar: ["/kitap-takip", "/kitap-takip.html"],
    hazir: true,
  },
];

export function modulErisimVarMi(session, anahtar) {
  if (!session) return false;
  if (session.admin) return true;
  return Array.isArray(session.moduller) && session.moduller.includes(anahtar);
}

export function yolIcinModul(pathname) {
  return MODULLER.find((m) => m.korunan_yollar.some((y) => pathname === y || pathname.startsWith(y + "/")));
}

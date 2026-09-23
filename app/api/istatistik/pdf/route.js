import { NextResponse } from "next/server";
import path from "path";
import PDFDocument from "pdfkit";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { yoklamaNamazHesapla } from "../../../../lib/istatistikHesapla";

export const runtime = "nodejs";

const FONT_REGULAR = path.join(process.cwd(), "lib", "fonts", "DejaVuSans.ttf");
const FONT_BOLD = path.join(process.cwd(), "lib", "fonts", "DejaVuSans-Bold.ttf");
const LOGO = path.join(process.cwd(), "public", "logo.png");

const VAKIT_ETIKET = { sabah: "Sabah", ogle: "Öğle", ikindi: "İkindi", aksam: "Akşam", yatsi: "Yatsı" };

function tarihFormatlaKisa(t) {
  if (!t) return "";
  const [yil, ay, gun] = t.split("-");
  return `${gun}.${ay}.${yil}`;
}
function bugunUzun() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

// GET /api/istatistik/pdf?kaynak=yoklama&grup_id=...&tur_id=...&baslangic=...&bitis=...
// Seçilen grup + tarih aralığındaki her öğrenci için bir sayfalık, resmi
// görünümlü "veli mektubu" üretir — tek bir PDF'te, öğrenci başına bir sayfa.
export async function GET(req) {
  const kaynak = req.nextUrl.searchParams.get("kaynak") || "yoklama";
  if (kaynak === "gorev") {
    return NextResponse.json({ error: "Görev listeleri için veli mektubu üretilemez." }, { status: 400 });
  }
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const turId = req.nextUrl.searchParams.get("tur_id");
  const baslangic = req.nextUrl.searchParams.get("baslangic");
  const bitis = req.nextUrl.searchParams.get("bitis");

  const supabase = supabaseServer();
  const { sonuc, error } = await yoklamaNamazHesapla(supabase, { kaynak, grupId, turId, baslangic, bitis });
  if (error) return NextResponse.json({ error }, { status: 500 });
  if (!sonuc || sonuc.length === 0) {
    return NextResponse.json({ error: "Bu seçimde öğrenci bulunamadı." }, { status: 400 });
  }

  let grupAdi = "Tüm Öğrenciler";
  if (grupId) {
    const { data: grup } = await supabase.from("gruplar").select("isim").eq("id", grupId).maybeSingle();
    if (grup) grupAdi = grup.isim;
  }
  let turAdi = "";
  if (kaynak === "yoklama" && turId) {
    const { data: tur } = await supabase.from("yoklama_turleri").select("isim").eq("id", turId).maybeSingle();
    if (tur) turAdi = tur.isim;
  }

  const baslik = kaynak === "namaz" ? "Namaz Yoklama Durumu" : "Yoklama Durumu";

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.registerFont("gövde", FONT_REGULAR);
  doc.registerFont("kalın", FONT_BOLD);

  const parcalar = [];
  doc.on("data", (c) => parcalar.push(c));
  const bittiSoz = new Promise((resolve) => doc.on("end", resolve));

  sonuc.forEach((s, i) => {
    if (i > 0) doc.addPage();
    sayfaCiz(doc, s, { grupAdi, turAdi, baslik, kaynak, baslangic, bitis });
  });

  doc.end();
  await bittiSoz;
  const buffer = Buffer.concat(parcalar);

  const dosyaAdi = `veli-mektubu-${grupAdi}-${baslangic}-${bitis}.pdf`.replace(/\s+/g, "-");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
    },
  });
}

function sayfaCiz(doc, s, { grupAdi, turAdi, baslik, kaynak, baslangic, bitis }) {
  const solKenar = doc.page.margins.left;
  const genislik = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  try {
    doc.image(LOGO, solKenar, doc.y, { width: 150 });
  } catch {
    // logo bulunamazsa sessizce geç, mektup yine de üretilsin
  }
  doc.moveDown(3.2);

  doc.font("kalın").fontSize(16).fillColor("#1c2436").text("Yavuztürk Süleymaniye", solKenar, doc.y, { width: genislik });
  doc.font("kalın").fontSize(13).fillColor("#28334a").text(baslik, { width: genislik });
  doc.moveDown(1);

  doc.font("gövde").fontSize(11).fillColor("#202634");
  doc.text("Sayın Veli,", { width: genislik });
  doc.moveDown(0.6);
  doc.text(
    `Aşağıda, öğrencimiz ${s.ogrenci.ad_soyad} için ${tarihFormatlaKisa(baslangic)} – ${tarihFormatlaKisa(bitis)} tarihleri arasındaki ${
      kaynak === "namaz" ? "namaz" : turAdi || "yoklama"
    } durumu özetlenmiştir.`,
    { width: genislik, align: "justify" }
  );
  doc.moveDown(1.2);

  // Bilgi satırı
  doc.font("kalın").fontSize(11).text("Öğrenci: ", { continued: true }).font("gövde").text(s.ogrenci.ad_soyad);
  doc.font("kalın").fontSize(11).text("Grup: ", { continued: true }).font("gövde").text(grupAdi);
  doc.font("kalın").fontSize(11).text("Dönem: ", { continued: true }).font("gövde").text(`${tarihFormatlaKisa(baslangic)} – ${tarihFormatlaKisa(bitis)}`);
  doc.moveDown(1);

  // Özet tablo
  const satirlar =
    kaynak === "namaz"
      ? [
          ["Kıldı", s.geldi],
          ["Geç Kıldı", s.gecKildi],
          ["İzinli", s.izinli],
          ["Kılmadı", s.izinsiz],
        ]
      : [
          ["Geldi", s.geldi],
          ["İzinli", s.izinli],
          ["İzinsiz", s.izinsiz],
        ];

  const tabloY = doc.y + 4;
  const sutunG = genislik / satirlar.length;
  satirlar.forEach(([etiket, deger], i) => {
    const x = solKenar + i * sutunG;
    doc.rect(x, tabloY, sutunG - 6, 54).fillAndStroke("#f4f4f3", "#e4e4e1");
    doc.fillColor("#28334a").font("kalın").fontSize(20).text(String(deger), x, tabloY + 8, { width: sutunG - 6, align: "center" });
    doc.fillColor("#6b7280").font("gövde").fontSize(9.5).text(etiket, x, tabloY + 34, { width: sutunG - 6, align: "center" });
  });
  doc.y = tabloY + 54 + 14;
  doc.x = solKenar;

  if (s.oran !== null) {
    doc.font("kalın").fontSize(11).fillColor("#202634").text(`${kaynak === "namaz" ? "Kılma" : "Devam"} oranı: `, solKenar, doc.y, { continued: true }).font("gövde").text(`%${s.oran}`);
    doc.moveDown(0.8);
  }

  if (s.izinKayitlari && s.izinKayitlari.length > 0) {
    doc.font("kalın").fontSize(11).fillColor("#202634").text("İzinli olunan tarihler:", solKenar, doc.y, { width: genislik });
    doc.moveDown(0.3);
    doc.font("gövde").fontSize(10).fillColor("#202634");
    s.izinKayitlari.forEach((iz) => {
      const vakitMetni = iz.vakit ? ` (${VAKIT_ETIKET[iz.vakit] || iz.vakit})` : "";
      const sebepMetni = iz.sebep ? ` — ${iz.sebep}` : " — sebep belirtilmemiş";
      doc.text(`•  ${tarihFormatlaKisa(iz.tarih)}${vakitMetni}${sebepMetni}`, { width: genislik });
    });
    doc.moveDown(1);
  }

  doc.moveDown(1.5);
  doc.font("gövde").fontSize(10.5).fillColor("#202634").text("Bilgilerinize sunarız.", solKenar, doc.y, { width: genislik });
  doc.moveDown(0.3);
  doc.font("kalın").fontSize(10.5).text("Yavuztürk Süleymaniye Yurdu Yönetimi", { width: genislik });
  doc.font("gövde").fontSize(9).fillColor("#6b7280").text(`Bu belge ${bugunUzun()} tarihinde otomatik olarak oluşturulmuştur.`, { width: genislik });
}

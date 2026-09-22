import "./globals.css";
import AcilisEkrani from "../components/AcilisEkrani";

export const metadata = {
  title: "Yavuztürk Süleymaniye | Portal",
  description: "Yurt yoklama, namaz yoklama, kitap takip ve görev listeleri — tek portal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Koyu/açık tema tercihi sayfa boyanmadan ÖNCE uygulanır, böylece
            geçişte kısa bir "yanlış renkte açılıp sonra değişme" (flaş)
            olmaz. Kayıtlı tercih yoksa cihazın sistem tercihine bakılır. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var t = localStorage.getItem('yt-tema');
              if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'koyu' : 'acik';
              document.documentElement.setAttribute('data-tema', t);
            } catch (e) {}`,
          }}
        />
      </head>
      <body>
        <AcilisEkrani>{children}</AcilisEkrani>
      </body>
    </html>
  );
}

// Sayfa yenilenirken veya bir sayfadan diğerine geçilirken (veri sunucudan
// gelene kadar) Next.js bu ekranı gösterir. Kitap Takip'e girerkenki gibi
// tüm ekranı kaplayan büyük logo — kenar menüde ufak bir dönen ikon değil.
export default function Yukleniyor() {
  return (
    <div className="yukleniyor-tam-ekran">
      <img src="/logo.png" alt="Yavuztürk Süleymaniye" className="yukleniyor-tam-logo" />
      <div className="serit yukleniyor-serit" />
    </div>
  );
}

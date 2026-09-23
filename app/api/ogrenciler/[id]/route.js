import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { denetimKaydet } from "../../../../lib/denetim";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ogrenciler")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, { islem: "guncelleme", hedefTablo: "ogrenciler", hedefId: data.id, aciklama: `${data.ad_soyad} güncellendi` });
  return NextResponse.json({ ogrenci: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseServer();
  // Kalıcı silmek yerine pasif işaretliyoruz, geçmiş yoklama kayıtları bozulmasın diye
  const { data, error } = await supabase.from("ogrenciler").update({ aktif: false }).eq("id", params.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, { islem: "silme", hedefTablo: "ogrenciler", hedefId: params.id, aciklama: `${data?.ad_soyad || params.id} kaldırıldı` });
  return NextResponse.json({ ok: true });
}

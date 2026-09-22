import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET(req) {
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const supabase = supabaseServer();
  let q = supabase.from("ogrenciler").select("*").eq("aktif", true).order("ad_soyad");
  if (grupId) q = q.eq("grup_id", grupId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ogrenciler: data });
}

export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ogrenciler")
    .insert({
      ad_soyad: body.ad_soyad,
      grup_id: body.grup_id,
      anne_adi: body.anne_adi || null,
      anne_telefon: body.anne_telefon || null,
      anne_meslek: body.anne_meslek || null,
      baba_adi: body.baba_adi || null,
      baba_telefon: body.baba_telefon || null,
      baba_meslek: body.baba_meslek || null,
      diger_yakin_yakinlik: body.diger_yakin_yakinlik || null,
      diger_yakin_adi: body.diger_yakin_adi || null,
      diger_yakin_telefon: body.diger_yakin_telefon || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ogrenci: data });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { sunumVerisiGetir } from "../../../lib/sunumVerisi";

// GET /api/sunum — Sunum Modu'nun canlı yenilenmesi için. Herhangi bir
// geçerli oturum yeterli (İstatistik ile aynı erişim mantığı).
export async function GET() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });

  const veri = await sunumVerisiGetir(session);
  return NextResponse.json(veri);
}

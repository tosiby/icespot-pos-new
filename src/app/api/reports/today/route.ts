import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    const { data, error } = await supabase
      .from("sales")
      .select("total_amount")
      .eq("shift_date", new Date().toISOString().slice(0, 10));

    if (error) throw error;

    const total =
      data?.reduce((s, r) => s + Number(r.total_amount), 0) || 0;

    return NextResponse.json({ total });
  } catch (err) {
    console.error("TODAY REPORT ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
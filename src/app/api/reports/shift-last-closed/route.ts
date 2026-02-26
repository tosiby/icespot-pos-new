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
    /* ================= AUTH ================= */

    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;

    if (!token) {
      return NextResponse.json({ shift: null });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ shift: null });
    }

    /* ================= GET LAST CLOSED ================= */

    const { data, error } = await supabase
      .from("shift_sessions")
      .select(`
        id,
        opened_at,
        closed_at,
        opening_cash,
        closing_cash,
        total_sales,
        cash_sales,
        upi_sales,
        expected_cash,
        difference
      `)
      .eq("status", "CLOSED")
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ shift: null });
    }

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      shift: {
        ...data,
        opening_cash: Number(data.opening_cash || 0),
        closing_cash: Number(data.closing_cash || 0),
        total_sales: Number(data.total_sales || 0),
        cash_sales: Number(data.cash_sales || 0),
        upi_sales: Number(data.upi_sales || 0),
        expected_cash: Number(data.expected_cash || 0),
        difference: Number(data.difference || 0),
      },
    });
  } catch (err) {
    console.error("LAST CLOSED SHIFT ERROR:", err);
    return NextResponse.json({ shift: null });
  }
}
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
      return NextResponse.json({
        open: false,
        status: "NONE",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET!);

    /* ================= GET LATEST SHIFT ================= */

    const { data: shift, error } = await supabase
      .from("shift_sessions")
      .select("id,status,opened_at,opening_cash")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!shift) {
      return NextResponse.json({
        open: false,
        status: "NONE",
      });
    }

    /* ================= IF NOT OPEN ================= */

    if (shift.status !== "OPEN") {
      return NextResponse.json({
        open: false,
        status: shift.status,
        shift_id: shift.id,
      });
    }

    /* ================= CALCULATE CASH SALES ================= */

    const { data: sales } = await supabase
      .from("sales")
      .select("total_amount,payment_mode")
      .eq("shift_id", shift.id);

    let cashSales = 0;

    (sales || []).forEach((s: any) => {
      if (s.payment_mode === "CASH") {
        cashSales += Number(s.total_amount || 0);
      }
    });

    const openingCash = Number(shift.opening_cash || 0);
    const expectedCash = openingCash + cashSales;

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      open: true,
      status: shift.status,
      shift_id: shift.id,
      opening_cash: openingCash,
      cash_sales: cashSales,
      expected_cash: expectedCash,
    });
  } catch (err) {
    console.error("SHIFT STATUS ERROR:", err);
    return NextResponse.json({
      open: false,
      status: "ERROR",
    });
  }
}
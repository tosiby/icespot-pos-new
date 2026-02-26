import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // ✅ latest OPEN shift (global POS)
    const { data: shift, error: shiftError } = await supabase
      .from("shift_sessions")
      .select("id, opening_cash, opened_at")
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shiftError) throw shiftError;

    if (!shift) {
      return NextResponse.json({
        open: false,
        shift: null,
      });
    }

    // ✅ sales for this shift
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("total_amount, payment_mode")
      .eq("shift_id", shift.id);

    if (salesError) throw salesError;

    let total = 0;
    let cash = 0;
    let upi = 0;

    (sales || []).forEach((s: any) => {
      const amt = Number(s.total_amount || 0);
      total += amt;

      if (s.payment_mode === "CASH") cash += amt;
      if (s.payment_mode === "UPI") upi += amt;
    });

    const openingCash = Number(shift.opening_cash || 0);
    const expected = openingCash + cash;

    return NextResponse.json({
      open: true,
      shift: {
        shift_id: shift.id,
        opened_at: shift.opened_at,
        opening_cash: openingCash,
        cash_sales: cash,
        upi_sales: upi,
        total_sales: total,
        expected_cash: expected,
      },
    });
  } catch (err) {
    console.error("SHIFT LIVE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch live shift" },
      { status: 500 }
    );
  }
}
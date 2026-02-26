import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // =========================
    // 1️⃣ Auth
    // =========================
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // =========================
    // 2️⃣ Validate Closing Cash
    // =========================
    const body = await req.json().catch(() => ({}));
    let closingCash = Number(body?.closing_cash);

    if (isNaN(closingCash) || closingCash < 0) {
      return NextResponse.json(
        { error: "Invalid closing cash amount" },
        { status: 400 }
      );
    }

    closingCash = Math.round(closingCash * 100) / 100;

    // =========================
    // 3️⃣ Get OPEN Shift
    // =========================
    const { data: shift, error: shiftError } = await supabase
      .from("shift_sessions")
      .select("*")
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shiftError) throw shiftError;

    if (!shift) {
      return NextResponse.json(
        { error: "No open shift found" },
        { status: 400 }
      );
    }

    // =========================
    // 4️⃣ Get Sales For Shift
    // =========================
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("total_amount,payment_mode")
      .eq("shift_id", shift.id);

    if (salesError) throw salesError;

    let total_sales = 0;
    let cash_sales = 0;
    let upi_sales = 0;

    (sales || []).forEach((s: any) => {
      const amt = Number(s.total_amount || 0);
      total_sales += amt;

      if (s.payment_mode === "CASH") cash_sales += amt;
      if (s.payment_mode === "UPI") upi_sales += amt;
    });

    total_sales = Math.round(total_sales * 100) / 100;
    cash_sales = Math.round(cash_sales * 100) / 100;
    upi_sales = Math.round(upi_sales * 100) / 100;

    // =========================
    // 5️⃣ Reconciliation Logic
    // =========================
    const expected_cash =
      Math.round(
        (Number(shift.opening_cash || 0) + cash_sales) * 100
      ) / 100;

    const difference =
      Math.round((closingCash - expected_cash) * 100) / 100;

    // =========================
    // 6️⃣ Update Shift (Lock Status)
    // =========================
   // =========================
// 6️⃣ Update Shift (Atomic Lock)
// =========================
const { data: updatedShift, error: updateError } = await supabase
  .from("shift_sessions")
  .update({
    status: "CLOSED",
    total_sales,
    cash_sales,
    upi_sales,
    expected_cash,
    closing_cash: closingCash,
    difference,
    closed_at: new Date().toISOString(),
  })
  .eq("id", shift.id)
  .eq("status", "OPEN") // 🔒 prevents double close
  .select("id")
  .maybeSingle();

if (updateError) throw updateError;

// 🚨 CRITICAL GUARD — ensures row actually updated
if (!updatedShift) {
  return NextResponse.json(
    { error: "Shift already closed or failed to lock" },
    { status: 409 }
  );
}

    // =========================
    // 7️⃣ Response
    // =========================
    return NextResponse.json({
      success: true,
      summary: {
        opening_cash: shift.opening_cash,
        total_sales,
        cash_sales,
        upi_sales,
        expected_cash,
        closing_cash: closingCash,
        difference,
      },
    });
  } catch (err) {
    console.error("SHIFT CLOSE ERROR:", err);
    return NextResponse.json(
      { error: "Shift close failed" },
      { status: 500 }
    );
  }
}
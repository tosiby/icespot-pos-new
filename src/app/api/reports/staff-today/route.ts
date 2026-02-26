import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// =====================================================
// 🔌 SUPABASE CLIENT — lazy singleton
// =====================================================
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

// =====================================================
// 🔐 AUTH
// =====================================================
async function getUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}

// =====================================================
// 🚀 GET STAFF TODAY SUMMARY
// =====================================================
export async function GET() {
  try {
    const user: any = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();
    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from("sales")
      .select("payment_mode,total_amount,created_by")
      .eq("shift_date", today);

    // STAFF → only their own sales
    if (user.role === "STAFF") {
      query = query.eq("created_by", user.userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("STAFF TODAY SUPABASE ERROR:", error);
      return NextResponse.json(
        { error: error.message || "Database error" },
        { status: 502 }
      );
    }

    return NextResponse.json(buildSummary(data ?? []));
  } catch (e: any) {
    console.error("STAFF TODAY ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// 🧮 HELPER — build payment summary
// =====================================================
function buildSummary(rows: any[]) {
  let cash = 0;
  let upi = 0;
  let card = 0;

  for (const r of rows) {
    const amount = Number(r.total_amount ?? 0);
    if (r.payment_mode === "CASH") cash += amount;
    else if (r.payment_mode === "UPI") upi += amount;
    else if (r.payment_mode === "CARD") card += amount;
  }

  return {
    cash,
    upi,
    card,
    total: cash + upi + card,
    count: rows.length,
  };
}
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
    // 🔐 auth
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    // 🚫 STAFF cannot access
    if (decoded.role === "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // =========================
    // SALES SUMMARY
    // =========================
    const { data: sales, error: salesErr } = await supabase
      .from("sales")
      .select("total_amount, payment_mode")
      .eq("shift_date", today);

    if (salesErr) throw salesErr;

    const totalSales =
      sales?.reduce((s, r) => s + Number(r.total_amount), 0) || 0;

    const cash =
      sales
        ?.filter((s) => s.payment_mode === "CASH")
        .reduce((s, r) => s + Number(r.total_amount), 0) || 0;

    const upi =
      sales
        ?.filter((s) => s.payment_mode === "UPI")
        .reduce((s, r) => s + Number(r.total_amount), 0) || 0;

    const card =
      sales
        ?.filter((s) => s.payment_mode === "CARD")
        .reduce((s, r) => s + Number(r.total_amount), 0) || 0;

    // =========================
    // BILL COUNT
    // =========================
    const billCount = sales?.length || 0;

    // =========================
    // TOP ITEMS
    // =========================
    const { data: items, error: itemErr } = await supabase
      .from("sale_items")
      .select(`
        quantity,
        product:products(name)
      `)
      .gte("created_at", today);

    if (itemErr) throw itemErr;

    const itemMap: Record<string, number> = {};

    items?.forEach((i: any) => {
      const name = i.product?.name || "Item";
      itemMap[name] = (itemMap[name] || 0) + Number(i.quantity);
    });

    const topItems = Object.entries(itemMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return NextResponse.json({
      totalSales,
      cash,
      upi,
      card,
      billCount,
      topItems,
    });
  } catch (err) {
    console.error("Z REPORT ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
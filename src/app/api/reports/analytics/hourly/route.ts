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

    jwt.verify(token, process.env.JWT_SECRET!);

    // Fetch today's sales with created_at + payment_mode
    const today = new Date().toISOString().slice(0, 10);

    const { data: sales, error } = await supabase
      .from("sales")
      .select("total_amount, payment_mode, created_at")
      .eq("shift_date", today)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Build 24-slot hourly buckets
    const hourly: Record<number, { total: number; count: number; cash: number; upi: number; card: number }> = {};

    for (let h = 0; h < 24; h++) {
      hourly[h] = { total: 0, count: 0, cash: 0, upi: 0, card: 0 };
    }

    (sales || []).forEach((s: any) => {
      const hour = new Date(s.created_at).getHours();
      const amt = Number(s.total_amount || 0);

      hourly[hour].total += amt;
      hourly[hour].count += 1;

      if (s.payment_mode === "CASH") hourly[hour].cash += amt;
      if (s.payment_mode === "UPI") hourly[hour].upi += amt;
      if (s.payment_mode === "CARD") hourly[hour].card += amt;
    });

    // Only return hours from 6am to now (trim dead hours)
    const currentHour = new Date().getHours();
    const startHour = 6;

    const slots = [];
    for (let h = startHour; h <= Math.max(currentHour, startHour); h++) {
      slots.push({
        hour: h,
        label: h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`,
        ...hourly[h],
      });
    }

    // Peak hour
    const peak = slots.reduce((max, s) => (s.total > max.total ? s : max), slots[0] || { hour: -1, total: 0, label: "-" });

    return NextResponse.json({
      slots,
      peak,
      total_today: Object.values(hourly).reduce((s, h) => s + h.total, 0),
      total_bills: Object.values(hourly).reduce((s, h) => s + h.count, 0),
    });
  } catch (err) {
    console.error("HOURLY REPORT ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

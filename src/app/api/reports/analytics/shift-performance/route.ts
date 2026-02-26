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

    // Get last 10 closed shifts
    const { data: shifts, error: shiftErr } = await supabase
      .from("shift_sessions")
      .select("id, opened_at, closed_at, total_sales, cash_sales, upi_sales, difference, opening_cash, closing_cash, expected_cash")
      .eq("status", "CLOSED")
      .not("closed_at", "is", null)
      .order("opened_at", { ascending: false })
      .limit(10);

    if (shiftErr) throw shiftErr;

    if (!shifts || shifts.length === 0) {
      return NextResponse.json({ shifts: [], summary: null });
    }

    // Get bill count per shift from sales
    const shiftIds = shifts.map((s) => s.id);
    const { data: saleCounts, error: saleErr } = await supabase
      .from("sales")
      .select("shift_id")
      .in("shift_id", shiftIds);

    if (saleErr) throw saleErr;

    // Count bills per shift
    const billMap: Record<string, number> = {};
    (saleCounts || []).forEach((s: any) => {
      billMap[s.shift_id] = (billMap[s.shift_id] || 0) + 1;
    });

    // Format and reverse so oldest → newest (for chart L→R)
    const formatted = shifts
      .map((s: any) => {
        const openedAt = new Date(s.opened_at);
        const closedAt = s.closed_at ? new Date(s.closed_at) : null;
        const durationMins = closedAt
          ? Math.round((closedAt.getTime() - openedAt.getTime()) / 60000)
          : null;

        return {
          id: s.id,
          label: openedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          time_label: openedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          opened_at: s.opened_at,
          closed_at: s.closed_at,
          duration_mins: durationMins,
          total_sales: Number(s.total_sales || 0),
          cash_sales: Number(s.cash_sales || 0),
          upi_sales: Number(s.upi_sales || 0),
          difference: Number(s.difference || 0),
          opening_cash: Number(s.opening_cash || 0),
          closing_cash: Number(s.closing_cash || 0),
          expected_cash: Number(s.expected_cash || 0),
          bill_count: billMap[s.id] || 0,
          avg_bill:
            billMap[s.id] > 0
              ? Math.round(Number(s.total_sales || 0) / billMap[s.id])
              : 0,
        };
      })
      .reverse(); // oldest → newest for chart

    // Summary stats across all fetched shifts
    const totalRevenue = formatted.reduce((s, sh) => s + sh.total_sales, 0);
    const avgPerShift = formatted.length > 0 ? Math.round(totalRevenue / formatted.length) : 0;
    const bestShift = formatted.reduce((max, s) => (s.total_sales > max.total_sales ? s : max), formatted[0]);
    const totalBills = formatted.reduce((s, sh) => s + sh.bill_count, 0);

    return NextResponse.json({
      shifts: formatted,
      summary: {
        total_revenue: totalRevenue,
        avg_per_shift: avgPerShift,
        best_shift: bestShift,
        total_bills: totalBills,
        shift_count: formatted.length,
      },
    });
  } catch (err) {
    console.error("SHIFT PERFORMANCE ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

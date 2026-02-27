import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/requireRole";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    await requireRole(["SUPERADMIN"]);
    const supabase = getSupabase();

    const today = new Date().toISOString().slice(0, 10);

    const [salesRes, shiftsRes, productsRes, usersRes, itemsRes] = await Promise.all([
      supabase.from("sales").select("total_amount, payment_mode, created_at").eq("shift_date", today),
      supabase.from("shift_sessions").select("id, status, opened_at").eq("status", "OPEN"),
      supabase.from("products").select("id, name, stock_qty, reorder_level"),
      supabase.from("User").select("id, email, role, isActive"),
      supabase.from("sale_items").select("quantity, product:products(name)").gte("created_at", today),
    ]);

    const sales = salesRes.data ?? [];
    const totalSales = sales.reduce((s, r) => s + Number(r.total_amount), 0);
    const cash = sales.filter(s => s.payment_mode === "CASH").reduce((s, r) => s + Number(r.total_amount), 0);
    const upi = sales.filter(s => s.payment_mode === "UPI").reduce((s, r) => s + Number(r.total_amount), 0);
    const card = sales.filter(s => s.payment_mode === "CARD").reduce((s, r) => s + Number(r.total_amount), 0);

    const products = productsRes.data ?? [];
    const lowStock = products.filter(p => Number(p.reorder_level) > 0 && Number(p.stock_qty) <= Number(p.reorder_level) && Number(p.stock_qty) > 0);
    const outOfStock = products.filter(p => Number(p.stock_qty) <= 0);

    // top items
    const itemMap: Record<string, number> = {};
    (itemsRes.data ?? []).forEach((i: any) => {
      const name = i.product?.name || "Unknown";
      itemMap[name] = (itemMap[name] || 0) + Number(i.quantity);
    });
    const topItems = Object.entries(itemMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const users = usersRes.data ?? [];

    return NextResponse.json({
      today: {
        totalSales,
        cash,
        upi,
        card,
        billCount: sales.length,
      },
      activeShifts: (shiftsRes.data ?? []).length,
      stock: {
        total: products.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        lowStockItems: lowStock.slice(0, 5).map(p => ({ name: p.name, qty: p.stock_qty })),
      },
      users: {
        total: users.length,
        active: users.filter(u => u.isActive !== false).length,
        byRole: {
          STAFF: users.filter(u => u.role === "STAFF").length,
          MANAGER: users.filter(u => u.role === "MANAGER").length,
          ADMIN: users.filter(u => u.role === "ADMIN").length,
        },
      },
      topItems,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("SUPERADMIN STATS ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
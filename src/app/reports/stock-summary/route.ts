import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    // 🔐 auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    jwt.verify(token, process.env.JWT_SECRET!);

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        sku,
        name,
        selling_price,
        stock_qty,
        reorder_level,
        is_active,
        categories(name)
      `)
      .order("name");

    if (error) throw error;

    const products = (data || []).map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      selling_price: Number(p.selling_price ?? 0),
      current_stock: Number(p.stock_qty ?? 0),
      reorder_level: Number(p.reorder_level ?? 0),
      is_active: p.is_active !== false,
      category_name: p.categories?.name || "Uncategorized",
    }));

    const total_products = products.length;
    const total_quantity = products.reduce((s, p) => s + p.current_stock, 0);
    const low_stock = products.filter(
      p => p.reorder_level > 0 && p.current_stock > 0 && p.current_stock <= p.reorder_level
    ).length;
    const out_of_stock = products.filter(p => p.current_stock <= 0).length;

    return NextResponse.json({
      summary: { total_products, total_quantity, low_stock, out_of_stock },
      products,
    });
  } catch (err: any) {
    console.error("STOCK SUMMARY ERROR:", err);
    return NextResponse.json({ summary: {}, products: [] }, { status: 500 });
  }
}
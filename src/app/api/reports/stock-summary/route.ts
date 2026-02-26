import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch products with category
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        sku,
        name,
        stock_qty,
        reorder_level,
        categories(name)
      `);

    if (error) throw error;

    const products = (data || []).map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      current_stock: p.stock_qty,
      reorder_level: p.reorder_level,
      category_name: p.categories?.name || "Uncategorized",
    }));

    // Build summary
    const total_products = products.length;
    const total_quantity = products.reduce(
      (sum: number, p: any) => sum + (p.current_stock || 0),
      0
    );

    const low_stock = products.filter(
      (p: any) =>
        p.reorder_level > 0 &&
        p.current_stock > 0 &&
        p.current_stock <= p.reorder_level
    ).length;

    const out_of_stock = products.filter(
      (p: any) => p.current_stock <= 0
    ).length;

    return NextResponse.json({
      summary: {
        total_products,
        total_quantity,
        low_stock,
        out_of_stock,
      },
      products,
    });
  } catch (err) {
    console.error("STOCK SUMMARY ERROR:", err);
    return NextResponse.json(
      { summary: {}, products: [] },
      { status: 500 }
    );
  }
}
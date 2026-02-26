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

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // 🔒 STAFF blocked
    if (decoded.role === "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // -------------------------------------------------
    // 📦 get products with stock
    // -------------------------------------------------
   // -------------------------------------------------
// 📦 get products with stock (FIXED FOR YOUR SCHEMA)
// -------------------------------------------------
const { data, error } = await supabase
  .from("products")
  .select(`
    id,
    sku,
    name,
    stock_qty,
    reorder_level,
    categories:category_id (
      name
    )
  `)
  .order("name");

if (error) {
  console.error("PRODUCT QUERY ERROR:", error);
  throw error;
}

const products = (data || []).map((p: any) => ({
  id: p.id,
  sku: p.sku,
  name: p.name,
  category_name: p.categories?.name || "-",
  current_stock: Number(p.stock_qty || 0),
  reorder_level: Number(p.reorder_level || 0),
}));

    

    // -------------------------------------------------
    // 🧠 compute summary
    // -------------------------------------------------
    let totalQty = 0;
    let lowCount = 0;
    let outCount = 0;

    products.forEach((p) => {
      totalQty += Number(p.current_stock || 0);

      if (p.current_stock <= 0) outCount++;
      else if (
        p.reorder_level > 0 &&
        p.current_stock <= p.reorder_level
      ) {
        lowCount++;
      }
    });

    return NextResponse.json({
      summary: {
        total_products: products.length,
        total_quantity: totalQty,
        low_stock: lowCount,
        out_of_stock: outCount,
      },
      products,
    });
  } catch (err) {
    console.error("STOCK SUMMARY ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
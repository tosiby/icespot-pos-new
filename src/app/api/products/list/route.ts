import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        sku,              
        name,
        selling_price,
        categories (
          name
        )
      `)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("PRODUCT LIST ERROR:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 🔧 normalize for frontend
    const formatted = data.map((p: any) => ({
      id: p.id,
      sku: p.sku, // ⭐ CRITICAL ADD
      name: p.name,
      price: p.selling_price,
      category_name: p.categories?.name || "OTHER",
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("PRODUCT LIST FATAL:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
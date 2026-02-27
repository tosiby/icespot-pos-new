import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/requireRole";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// PATCH /api/products/update
// Body: { id, name?, selling_price?, reorder_level? }
export async function PATCH(req: Request) {
  try {
    await requireRole(["SUPERADMIN", "ADMIN"]);
    const supabase = getSupabase();

    const body = await req.json();
    const { id, name, selling_price, reorder_level } = body;

    if (!id) {
      return NextResponse.json({ error: "Product id required" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) {
      if (!name.trim()) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      updates.name = name.trim();
    }
    if (selling_price !== undefined) {
      const price = Number(selling_price);
      if (isNaN(price) || price < 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      updates.selling_price = price;
    }
    if (reorder_level !== undefined) {
      updates.reorder_level = Number(reorder_level) || 0;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("PRODUCT UPDATE ERROR:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
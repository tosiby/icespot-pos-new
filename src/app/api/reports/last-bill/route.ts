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

    // ✅ get latest sale
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .select("id, invoice_number, total_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (saleErr || !sale) {
      return NextResponse.json({ error: "No bill found" }, { status: 404 });
    }

    // ✅ get items of that sale
    const { data: items } = await supabase
      .from("sale_items")
      .select("name, quantity, unit_price")
      .eq("sale_id", sale.id);

    const formattedItems =
      items?.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        total: Number(i.unit_price) * Number(i.quantity),
      })) || [];

    return NextResponse.json({
      invoice_number: sale.invoice_number,
      total_amount: sale.total_amount,
      created_at: sale.created_at,
      items: formattedItems,
    });
  } catch (err) {
    console.error("LAST BILL ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
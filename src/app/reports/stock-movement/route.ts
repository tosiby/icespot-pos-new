import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");

    let query = supabase
      .from("stock_ledger")
      .select(`
        id,
        type,
        quantity,
        reference_note,
        created_at,
        products (
          sku,
          name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(500);

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (type && type !== "ALL") query = query.eq("type", type);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ movements: data || [] });
  } catch (err: any) {
    console.error("STOCK MOVEMENT ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
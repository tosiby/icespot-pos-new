import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File missing" },
        { status: 400 }
      );
    }

    // 📥 read file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let processed = 0;
    let errors: any[] = [];

    // 🔁 process each row
    for (const row of rows) {
      try {
        const qty = Number(row.Quantity);

        if (!qty || qty <= 0) {
          errors.push({ row, error: "Invalid quantity" });
          continue;
        }

        // =====================================================
        // 🔎 SMART PRODUCT RESOLVER (SKU → Name fallback)
        // =====================================================
        let product: any = null;

        // 1️⃣ try by SKU first (fast & safest)
        if (row.SKU) {
          const res = await supabase
            .from("products")
            .select("id, stock_qty")
            .eq("sku", String(row.SKU).trim())
            .maybeSingle();

          product = res.data;
        }

        // 2️⃣ fallback by Name (case-insensitive)
        if (!product && row.Name) {
          const res = await supabase
            .from("products")
            .select("id, stock_qty")
            .ilike("name", String(row.Name).trim())
            .maybeSingle();

          product = res.data;
        }

        // ❌ still not found
        if (!product) {
          errors.push({
            row,
            error: "Product not found (check SKU/Name)",
          });
          continue;
        }

        // =====================================================
        // 🔼 increase stock
        // =====================================================
        const { error: updateError } = await supabase
          .from("products")
          .update({
            stock_qty: (product.stock_qty || 0) + qty,
          })
          .eq("id", product.id);

        if (updateError) throw updateError;

        // =====================================================
        // 🧾 ledger entry
        // =====================================================
        const { error: ledgerError } = await supabase
          .from("stock_ledger")
          .insert({
            product_id: product.id,
            type: "PURCHASE",
            quantity: qty,
            reference_note: "EXCEL_UPLOAD",
            created_at: new Date().toISOString(),
          });

        if (ledgerError) throw ledgerError;

        processed++;
      } catch (e: any) {
        errors.push({ row, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed: errors.length,
      errors,
    });
  } catch (err: any) {
    console.error("PURCHASE UPLOAD ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
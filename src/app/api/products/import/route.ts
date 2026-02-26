import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import * as XLSX from "xlsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 🔐 auth
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    if (decoded.role === "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 📥 read file
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File missing" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let created = 0;
    let updated = 0;

    for (const r of rows) {
      const name = String(r.name || "").trim();
      const price = Number(r.price || 0);
      const categoryName = String(r.category || "").trim();
      const qty = Number(r.qty || 0);

      if (!name) continue;

      // 🔎 category
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("name", categoryName)
        .maybeSingle();

      if (!cat) continue;

      // 🔎 product exists?
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("name", name)
        .maybeSingle();

      let productId: string;

      if (existing) {
        productId = existing.id;

        await supabase
          .from("products")
          .update({ price })
          .eq("id", productId);

        updated++;
      } else {
        const { data: newProd } = await supabase
          .from("products")
          .insert({
            name,
            price,
            category_id: cat.id,
          })
          .select("id")
          .single();

        productId = newProd!.id;
        created++;
      }

      // 📦 inventory upsert
      await supabase.from("inventory").upsert({
        product_id: productId,
        quantity: qty,
      });
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: rows.length,
    });
  } catch (err) {
    console.error("IMPORT ERROR:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
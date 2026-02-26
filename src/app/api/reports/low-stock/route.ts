import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// =====================================================
// 🔌 SUPABASE CLIENT — lazy singleton
// =====================================================
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("Missing Supabase env vars");

  _supabase = createClient(url, key);
  return _supabase;
}

// =====================================================
// 🔐 AUTH
// =====================================================
async function getUser(): Promise<any | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;
    if (!token) return null;

    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}

// =====================================================
// ⏱️ TIMEOUT WRAPPER (prevents hanging requests)
// =====================================================
async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Supabase timeout")), ms)
  );

  return Promise.race([promise, timeout]);
}

// =====================================================
// 🚀 GET LOW STOCK
// =====================================================
export async function GET() {
  try {
    // 🔐 Auth check
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();

    // =====================================================
    // 📦 Fetch products (with timeout protection)
    // =====================================================
    let data: any[] | null = null;
    let error: any = null;

    try {
     const res = await withTimeout(
  (async () =>
    supabase
      .from("products")
      .select("id,name,stock_qty,reorder_level")
      .order("stock_qty", { ascending: true })
      .limit(200)
  )(),
  5000
);

      data = res.data;
      error = res.error;
    } catch (e) {
      console.error("LOW STOCK TIMEOUT/NETWORK:", e);

      // ✅ graceful fallback — NEVER break dashboard
      return NextResponse.json({ items: [] });
    }

    // =====================================================
    // ❌ Supabase error handling
    // =====================================================
    if (error) {
      console.error("LOW STOCK SUPABASE ERROR:", error);

      // ✅ graceful fallback for dashboard stability
      return NextResponse.json({ items: [] });
    }

    // =====================================================
    // 🧠 Business filtering
    // =====================================================
    const items = (data ?? [])
      .filter((p: any) => {
        const stock = Number(p.stock_qty ?? 0);
        const reorder = Number(p.reorder_level ?? 0);
        return reorder > 0 && stock <= reorder;
      })
      .slice(0, 20)
      .map((p: any) => ({
        product: { id: p.id, name: p.name },
        current_stock: Number(p.stock_qty ?? 0),
      }));

    // =====================================================
    // ✅ Success
    // =====================================================
    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("LOW STOCK FATAL:", err);

    // 🔥 FINAL SAFETY NET — dashboard must never crash
    return NextResponse.json({ items: [] });
  }
}
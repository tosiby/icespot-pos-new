import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("SHIFT OPEN START");

    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;

    console.log("TOKEN:", !!token);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    console.log("DECODED:", decoded);

    const body = await req.json().catch(() => ({}));
    console.log("BODY:", body);

    const openingCash = Number(body?.opening_cash ?? 0);
    console.log("OPENING CASH:", openingCash);

    const { data: existing, error: existingError } = await supabase
      .from("shift_sessions")
      .select("id")
      .eq("status", "OPEN")
      .limit(1)
      .maybeSingle();

    console.log("EXISTING:", existing);
    console.log("EXISTING ERROR:", existingError);

    if (existingError) throw existingError;

    if (existing) {
      return NextResponse.json(
        { error: "Shift already open" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("shift_sessions")
      .insert({
        user_id: decoded.userId,
        opening_cash: openingCash,
        status: "OPEN",
        opened_at: new Date().toISOString(),
      });

    console.log("INSERT ERROR:", insertError);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SHIFT OPEN ERROR:", err);
    return NextResponse.json(
      { error: "Failed to open shift" },
      { status: 500 }
    );
  }
}
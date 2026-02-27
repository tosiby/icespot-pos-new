import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/requireRole";
import bcrypt from "bcryptjs";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    await requireRole(["SUPERADMIN"]);
    const supabase = getSupabase();

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "userId and newPassword required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Prevent changing SUPERADMIN password via this route
    const { data: target } = await supabase
      .from("User")
      .select("role, email")
      .eq("id", userId)
      .single();

    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "SUPERADMIN") {
      return NextResponse.json({ error: "Cannot reset SUPERADMIN password here" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from("User")
      .update({ passwordHash })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true, email: target.email });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("RESET PASSWORD ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
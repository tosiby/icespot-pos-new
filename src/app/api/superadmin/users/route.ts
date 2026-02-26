import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/requireRole";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    await requireRole(["SUPERADMIN"]);

const { data, error } = await supabase
  .from("User")
  .select("id, email, role")
  .order("createdAt", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("SUPERADMIN USERS ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
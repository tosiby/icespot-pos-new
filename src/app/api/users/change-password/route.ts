import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/requireRole";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const user = await requireRole([
      "STAFF",
      "ADMIN",
      "SUPERADMIN",
    ]);

    const body = await req.json();
    const { target_user_id, new_password } = body;

    if (!new_password || new_password.length < 4) {
      return NextResponse.json(
        { error: "Weak password" },
        { status: 400 }
      );
    }

    // 🔐 permission rules

    // STAFF → only self
    if (user.role === "STAFF" && user.userId !== target_user_id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // ADMIN → cannot change SUPERADMIN
    if (user.role === "ADMIN") {
      const { data: target } = await supabase
        .from("User")
        .select("role")
        .eq("id", target_user_id)
        .single();

      if (target?.role === "SUPERADMIN") {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const hash = await bcrypt.hash(new_password, 10);

    const { error } = await supabase
      .from("User")
      .update({ passwordHash: hash })
      .eq("id", target_user_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("CHANGE PASSWORD ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
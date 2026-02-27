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

// GET — list all users
export async function GET() {
  try {
    await requireRole(["SUPERADMIN"]);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("User")
      .select("id, email, role, isActive, createdAt, lastLoginAt")
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("SUPERADMIN USERS GET ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — create new user
export async function POST(req: Request) {
  try {
    await requireRole(["SUPERADMIN"]);
    const supabase = getSupabase();

    const body = await req.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: "email, password and role are required" }, { status: 400 });
    }
    if (!["STAFF", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // check duplicate
    const { data: existing } = await supabase.from("User").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("User")
      .insert({ email, passwordHash, role, isActive: true })
      .select("id, email, role, isActive, createdAt")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, user: data });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("SUPERADMIN CREATE USER ERROR:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

// PATCH — update user (role, isActive)
export async function PATCH(req: Request) {
  try {
    await requireRole(["SUPERADMIN"]);
    const supabase = getSupabase();

    const body = await req.json();
    const { id, role, isActive } = body;

    if (!id) return NextResponse.json({ error: "User id required" }, { status: 400 });

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const { error } = await supabase.from("User").update(updates).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("SUPERADMIN UPDATE USER ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
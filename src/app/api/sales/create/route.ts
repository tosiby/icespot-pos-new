import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 🔐 get logged-in user
    const cookieStore = await cookies();
const token = cookieStore.get("icepos_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const payload = await req.json();

    // 🚀 call atomic DB function
   const { data, error } = await supabase.rpc(
  "create_sale_transaction",
  {
    payload,
    user_id: decoded.userId,
  }
);

if (error) throw error;

return NextResponse.json(data);
  } catch (err) {
    console.error("SALE FATAL:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
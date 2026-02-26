import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 🔐 get logged user
    const user: any = await getCurrentUser();

    if (!user?.id) {
      console.error("AUTH FAILED — user missing:", user);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 📦 parse body ONCE
    const body = await req.json();

    console.log("SALE REQUEST BODY:", body);

    const payload = {
      p_total_amount: body.total_amount,
      p_payment_mode: body.payment_mode,
      p_items: body.items,
      p_user_id: user.id,
    };

    console.log("RPC PARAMS CHECK:", payload);

    // 🚀 call Supabase function
    const { data, error } = await supabase.rpc(
      "create_sale_transaction",
      payload
    );

    if (error) {
      console.error("SALE RPC ERROR FULL:", error);
      return NextResponse.json(
        {
          error: error.message || "Sale failed",
          code: error.code || null,
          details: error.details || null,
        },
        { status: 400 }
      );
    }

    console.log("SALE SUCCESS:", data);

    return NextResponse.json(data ?? { success: true });
  } catch (err: any) {
    console.error("SALE FATAL:", err);
    return NextResponse.json(
      {
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
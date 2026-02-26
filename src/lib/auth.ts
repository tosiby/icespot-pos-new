import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("icepos_token")?.value;

    if (!token) return null;

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    // ✅ NORMALIZED SHAPE
    return {
      id: decoded.userId,
      role: decoded.role,
    };
  } catch (err) {
    console.error("AUTH ERROR:", err);
    return null;
  }
}
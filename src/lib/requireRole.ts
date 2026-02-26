import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function requireRole(allowed: string[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get("icepos_token")?.value;

  if (!token) throw new Error("UNAUTHORIZED");

  const decoded: any = jwt.verify(
    token,
    process.env.JWT_SECRET!
  );

  if (!allowed.includes(decoded.role)) {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}
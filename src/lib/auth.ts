import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "./prisma"

export async function getCurrentUser() {
  const token = cookies().get("token")?.value
  if (!token) return null

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    return await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
  } catch {
    return null
  }
}

import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  try {
    const token = cookies().get("token")?.value
    if (!token) return null

    const decoded = verify(token, process.env.JWT_SECRET!) as any

    // Fetch full user from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    return user
  } catch {
    return null
  }
}

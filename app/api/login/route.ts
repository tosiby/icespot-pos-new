import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sign } from "jsonwebtoken"


export async function POST(req: Request) {
  const { email, password } = await req.json()

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const token = sign(
    {
      id: user.id,
      role: user.role,
      branchId: user.branchId
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  )

  const res = NextResponse.json({
    success: true,
    role: user.role
  })

  res.cookies.set("token", token, {
    httpOnly: true,
    path: "/"
  })

  return res
}

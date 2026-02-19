import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "../../../lib/auth"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId, quantity, note } = await req.json()

  // Increase item stock
  await prisma.item.update({
    where: { id: itemId },
    data: {
      stock: { increment: quantity }
    }
  })

  // Create stock entry log
  await prisma.stockEntry.create({
    data: {
      itemId,
      quantity,
      note
    }
  })

  return NextResponse.json({ success: true })
}

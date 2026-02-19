import { prisma } from "../../../lib/prisma"
import { getCurrentUser } from "../../../lib/auth"
import { NextResponse } from "next/server"



export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { name: "asc" }
  })

  return NextResponse.json(items)
}

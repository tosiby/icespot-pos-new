import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"


export async function GET() {
  const history = await prisma.stockEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      item: true
    }
  })

  return NextResponse.json(history)
}

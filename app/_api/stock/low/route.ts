import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"


export async function GET() {
  const lowStockItems = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "Item"
    WHERE stock <= "lowStockLevel"
    ORDER BY stock ASC
  `)

  return NextResponse.json(lowStockItems)
}

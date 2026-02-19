import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

import { startOfDay, startOfMonth } from "date-fns"

export async function GET() {
  const today = startOfDay(new Date())
  const monthStart = startOfMonth(new Date())

  const [
    branchCount,
    userCount,
    todaySales,
    monthSales,
    lowStock,
    topItems
  ] = await Promise.all([
    prisma.branch.count(),
    prisma.user.count(),

    prisma.sale.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: today } }
    }),

    prisma.sale.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: monthStart } }
    }),

    prisma.product.findMany({
      where: { stock: { lt: 10 } },
      select: { id: true, name: true, stock: true }
    }),

    prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    })
  ])

  return NextResponse.json({
    branchCount,
    userCount,
    todaySales: todaySales._sum.total || 0,
    monthSales: monthSales._sum.total || 0,
    lowStock,
    topItems
  })
}

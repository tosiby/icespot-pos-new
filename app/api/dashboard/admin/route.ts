import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

import { startOfDay } from "date-fns"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  const today = startOfDay(new Date())

  const [todaySales, lowStock, staffCount] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        branchId: user.branchId,
        createdAt: { gte: today }
      }
    }),

    prisma.product.findMany({
      where: {
        branchId: user.branchId,
        stock: { lt: 10 }
      }
    }),

    prisma.user.count({
      where: { branchId: user.branchId }
    })
  ])

  return NextResponse.json({
    todaySales: todaySales._sum.total || 0,
    lowStock,
    staffCount
  })
}

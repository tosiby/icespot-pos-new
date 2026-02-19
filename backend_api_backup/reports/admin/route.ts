import { prisma } from "../../../lib/prisma"
import { getCurrentUser } from "../../../lib/auth"



export async function GET() {
  const today = new Date()
  today.setHours(0,0,0,0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0,0,0,0)

  const [
    todaySales,
    weekSales,
    monthSales,
    billCount,
    paymentSplit,
    topItems,
    dailyChart
  ] = await Promise.all([

    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: today } }
    }),

    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: weekStart } }
    }),

    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: monthStart } }
    }),

    prisma.sale.count({
      where: { createdAt: { gte: today } }
    }),

    prisma.sale.groupBy({
      by: ["paymentMode"],
      _sum: { totalAmount: true }
    }),

    prisma.saleItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    }),

    prisma.$queryRawUnsafe(`
      SELECT DATE("createdAt") as date, SUM("totalAmount") as total
      FROM "Sale"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY date
    `)
  ])

  return NextResponse.json({
    today: todaySales._sum.totalAmount || 0,
    week: weekSales._sum.totalAmount || 0,
    month: monthSales._sum.totalAmount || 0,
    billCount,
    paymentSplit,
    topItems,
    dailyChart
  })
}

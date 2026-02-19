import { prisma } from "../../../src/lib/prisma"
import { getCurrentUser } from "../../../src/lib/auth"

import * as XLSX from "xlsx"

export async function GET() {
  const sales = await prisma.sale.findMany({
    include: { saleItems: true }
  })

  const rows = sales.map(s => ({
    Bill: s.billNumber,
    Date: s.createdAt,
    Payment: s.paymentMode,
    Total: s.totalAmount
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales")

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  return new Response(buffer, {
    headers: {
      "Content-Disposition": "attachment; filename=sales.xlsx",
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  })
}

import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { getCurrentUser } from "../../../lib/auth"


export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { items, paymentMode, totalAmount } = await req.json()

  try {
    const result = await prisma.$transaction(async (tx) => {

      // 1️⃣ Check stock before sale
      for (const cartItem of items) {
        const dbItem = await tx.item.findUnique({
          where: { id: cartItem.itemId }
        })

        if (!dbItem || dbItem.stock < cartItem.quantity) {
          throw new Error(`Not enough stock for ${dbItem?.name}`)
        }
      }

      // 2️⃣ Create Sale record
      const sale = await tx.sale.create({
        data: {
          billNumber: "BILL-" + Date.now(),
          totalAmount,
          paymentMode,
          staffId: user.id
        }
      })

      // 3️⃣ Create SaleItems + Deduct stock + Ledger entry
      for (const cartItem of items) {

        // Sale item row
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            itemId: cartItem.itemId,
            quantity: cartItem.quantity,
            price: cartItem.price
          }
        })

        // Reduce stock
        await tx.item.update({
          where: { id: cartItem.itemId },
          data: {
            stock: { decrement: cartItem.quantity }
          }
        })

        // Add stock ledger (negative entry)
        await tx.stockEntry.create({
          data: {
            itemId: cartItem.itemId,
            quantity: -cartItem.quantity,
            note: "SALE"
          }
        })
      }

      return sale
    })

    return NextResponse.json(result)

  } catch (err:any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

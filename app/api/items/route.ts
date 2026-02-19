import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"



export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { name: "asc" }
  })

  return NextResponse.json(items)
}

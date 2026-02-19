import { prisma } from "../../../src/lib/prisma"
import { getCurrentUser } from "../../../src/lib/auth"


export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { name: "asc" }
  })

  return NextResponse.json(items)
}

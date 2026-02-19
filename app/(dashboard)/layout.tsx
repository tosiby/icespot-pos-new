import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-gray-900 text-white p-4 space-y-4">
        <h1 className="text-xl font-bold mb-6">ICE SPOT POS</h1>

        <nav className="space-y-2">
          <Link href="/dashboard" className="block hover:underline">
            POS
          </Link>
          <Link href="/admin" className="block hover:underline">
            Admin
          </Link>
          <Link href="/superadmin" className="block hover:underline">
            Super Admin
          </Link>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-100 p-6">
        {children}
      </main>
    </div>
  )
}

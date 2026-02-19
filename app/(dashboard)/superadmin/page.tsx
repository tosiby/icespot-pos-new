"use client"
import useSWR from "swr"
import { getCurrentUser } from "../../../lib/auth"

const fetcher = (url:string)=>fetch(url).then(r=>r.json())

export default function SuperAdminDashboard() {
  const { data } = useSWR("/api/dashboard/superadmin", fetcher)

  if (!data) return <p>Loading...</p>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">SuperAdmin Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card title="Branches" value={data.branchCount}/>
        <Card title="Users" value={data.userCount}/>
        <Card title="Today Sales" value={`₹${data.todaySales}`}/>
        <Card title="Month Sales" value={`₹${data.monthSales}`}/>
      </div>

    </div>
  )
}

function Card({title,value}:{title:string,value:any}) {
  return (
    <div className="bg-white shadow p-4 rounded-xl">
      <p className="text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

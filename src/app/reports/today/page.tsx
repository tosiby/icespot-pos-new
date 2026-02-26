"use client";

import { useEffect, useState } from "react";

export default function TodayReportPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/reports/today")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>📊 Today Sales</h1>

      <p>Total Sales: ₹{data.total_sales || 0}</p>
      <p>Total Bills: {data.total_bills || 0}</p>
      <p>Cash: ₹{data.cash || 0}</p>
      <p>UPI: ₹{data.upi || 0}</p>
      <p>Card: ₹{data.card || 0}</p>
    </div>
  );
}
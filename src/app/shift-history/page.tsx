"use client";

import { useEffect, useState } from "react";

export default function ShiftHistory() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/reports/shift-history");
    const json = await res.json();
    setData(json.shifts || []);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>📁 Shift History</h1>

      <div style={{ marginTop: 20 }}>
        {data.map((s) => (
          <div key={s.id} style={card}>
<button onClick={() => printShift(s)}>Print</button>
            <div>Status: {s.status}</div>
            <div>Opened: {new Date(s.opened_at).toLocaleString()}</div>
            <div>Closed: {s.closed_at ? new Date(s.closed_at).toLocaleString() : "-"}</div>
            <div>Total Sales: ₹{s.total_sales}</div>
            <div>Difference: ₹{s.difference}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function printShift(shift: any) {
  const win = window.open("", "PRINT", "width=400,height=600");
  if (!win) return;

  win.document.write(`
  <html>
  <body style="font-family:monospace;padding:20px">
    <h2>ICE SPOT - Shift Report</h2>
    <hr/>
    <div>Opened: ${new Date(shift.opened_at).toLocaleString()}</div>
    <div>Closed: ${shift.closed_at ? new Date(shift.closed_at).toLocaleString() : "-"}</div>
    <div>Opening Cash: ₹${shift.opening_cash}</div>
    <div>Total Sales: ₹${shift.total_sales}</div>
    <div>Expected Cash: ₹${shift.expected_cash}</div>
    <div>Counted Cash: ₹${shift.closing_cash}</div>
    <div>Difference: ₹${shift.difference}</div>
    <hr/>
  </body>
  </html>
  `);

  win.document.close();
  win.print();
}
const card: React.CSSProperties = {
  padding: 16,
  border: "1px solid #ddd",
  borderRadius: 8,
  marginBottom: 12,
};
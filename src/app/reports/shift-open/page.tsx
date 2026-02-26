"use client";

import { useState } from "react";

export default function ShiftOpenPage() {
  const [amount, setAmount] = useState("");

  async function openShift() {
    const res = await fetch("/api/reports/shift-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingFloat: Number(amount) }),
    });

    const data = await res.json();
    alert(data.success ? "Shift opened" : data.error);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🔓 Open Shift</h1>

      <input
        placeholder="Opening Float"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={openShift}>Open Shift</button>
    </div>
  );
}
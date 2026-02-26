"use client";

import { useEffect, useState } from "react";

/* ================= TYPES ================= */

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  category_name: string;
  current_stock: number;
  reorder_level: number;
};

type CartItem = {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
};

/* ================= COMPONENT ================= */

export default function BillingPage() {
  const [shiftOpen, setShiftOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [me, setMe] = useState<any>(null);
  const [lastBill, setLastBill] = useState<any>(null);
const [showOpenModal, setShowOpenModal] = useState(false);
const [showCloseModal, setShowCloseModal] = useState(false);
const [openingCash, setOpeningCash] = useState("");
const [closingCash, setClosingCash] = useState("");
  useEffect(() => {
    loadProducts();
    loadTodayTotal();
    loadMe();
    loadLastBill();
    loadShiftStatus();
  }, []);

  /* ================= LOADERS ================= */

  async function loadShiftStatus() {
    try {
      const res = await fetch("/api/reports/shift-status");
      if (!res.ok) return;
      const d = await res.json();
      setShiftOpen(Boolean(d?.open));
    } catch (err) {
      console.error("shift status failed", err);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch("/api/products/list");
      if (!res.ok) return;

      const data = await res.json();
      const safe: Product[] = Array.isArray(data) ? data : [];

      setProducts(safe);
      setCategories(
        Array.from(new Set(safe.map((p) => p.category_name)))
      );
    } catch (err) {
      console.error("LOAD PRODUCTS FAILED:", err);
    }
  }

  async function loadTodayTotal() {
    try {
      const res = await fetch("/api/reports/today");
      if (!res.ok) return;
      const data = await res.json();
      setTodayTotal(Number(data?.total || 0));
    } catch {}
  }

  async function loadMe() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) setMe(await res.json());
    } catch {}
  }

  async function loadLastBill() {
    try {
      const res = await fetch("/api/reports/last-bill");
      if (res.ok) setLastBill(await res.json());
    } catch {}
  }

  /* ================= SHIFT ================= */

async function confirmOpenShift() {
  const cash = Number(openingCash);

  if (!openingCash || isNaN(cash) || cash < 0) {
    alert("Enter valid opening cash");
    return;
  }

  const res = await fetch("/api/reports/shift-open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      opening_cash: cash,
    }),
  });

  if (!res.ok) {
    alert("Failed to open shift");
    return;
  }

  setShowOpenModal(false);
  setOpeningCash("");
  await loadShiftStatus();
}
async function confirmCloseShift() {
  const cash = Number(closingCash);

  if (!closingCash || isNaN(cash) || cash < 0) {
    alert("Enter counted cash");
    return;
  }

  const res = await fetch("/api/reports/shift-close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      closing_cash: cash,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err?.error || "Failed to close shift");
    return;
  }

  setShowCloseModal(false);
  setClosingCash("");
  await loadShiftStatus();
  await loadTodayTotal();
  window.location.reload();
}
  
function openShift() {
  setShowOpenModal(true);
}

function closeShift() {
  setShowCloseModal(true);
}
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function getQty(productId: string) {
    return cart.find((x) => x.product_id === productId)?.quantity ?? 0;
  }

  /* ================= CART ================= */

  function addToCart(p: Product) {
    const existingQty = getQty(p.id);

    // 🔒 HARD STOCK GUARD
    if (existingQty >= p.current_stock) return;

    setCart((prev) => {
      const existing = prev.find((x) => x.product_id === p.id);

      if (existing) {
        return prev.map((x) =>
          x.product_id === p.id
            ? { ...x, quantity: x.quantity + 1 }
            : x
        );
      }

      return [
        ...prev,
        {
          product_id: p.id,
          sku: p.sku,
          name: p.name,
          quantity: 1,
          unit_price: p.price,
        },
      ];
    });
  }

  function decrement(productId: string) {
    setCart((prev) =>
      prev
        .map((x) =>
          x.product_id === productId
            ? { ...x, quantity: x.quantity - 1 }
            : x
        )
        .filter((x) => x.quantity > 0)
    );
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }
  /* ================= STOCK STATE ================= */

  function getStockState(p: Product) {
    const isOut = p.current_stock <= 0;

    const isLow =
      !isOut &&
      p.reorder_level > 0 &&
      p.current_stock <= p.reorder_level;

    const isCritical =
      !isOut &&
      p.reorder_level > 0 &&
      p.current_stock <= Math.ceil(p.reorder_level * 0.5);

    return { isOut, isLow, isCritical };
  }
  /* ================= FILTER ================= */

    const filteredBase =
    activeCat === "ALL"
      ? products
      : products.filter((p) => p.category_name === activeCat);

  const filtered = [...filteredBase].sort((a, b) => {
    const sa = getStockState(a);
    const sb = getStockState(b);

    const priority = (s: any) =>
      s.isOut ? 0 : s.isCritical ? 1 : s.isLow ? 2 : 3;

    return priority(sa) - priority(sb);
  });

  const total = cart.reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0
  );
  /* ================= LOW STOCK SUMMARY ================= */

  let outCount = 0;
  let criticalCount = 0;
  let lowCount = 0;

  products.forEach((p) => {
    const s = getStockState(p);
    if (s.isOut) outCount++;
    else if (s.isCritical) criticalCount++;
    else if (s.isLow) lowCount++;
  });
  /* ================= PLACE ORDER ================= */

  async function placeOrder() {
    if (!shiftOpen) return alert("Shift is closed");
    if (!cart.length) return alert("Cart empty");

    setLoading(true);

    try {
      const res = await fetch("/api/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_amount: total,
          payment_mode: paymentMode,
          items: cart.map((i) => ({
            sku: i.sku,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        }),
      });

      setLoading(false);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Sale failed");
        return;
      }

      const data = await res.json();
      printReceipt(cart, total, paymentMode, data?.invoice_number);

      setCart([]);
      loadTodayTotal();
      loadLastBill();
    } catch {
      setLoading(false);
      alert("Network error");
    }
  }

  /* ================= REPRINT ================= */

  function reprintLastBill() {
    if (!lastBill) return;

    printReceipt(
      lastBill.items.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: i.total / i.quantity,
      })),
      lastBill.total_amount,
      "REPRINT",
      lastBill.invoice_number
    );
  }

  /* ================= PRINT ================= */

  function printReceipt(
    cartItems: CartItem[],
    total: number,
    payment: string,
    invoice?: string
  ) {
    const win = window.open("", "PRINT", "height=600,width=320");
    if (!win) return;

    const now = new Date();
    const baseUrl = window.location.origin;

    const rows = cartItems
      .map(
        (item) => `
<tr>
<td>${item.name} x${item.quantity}</td>
<td style="text-align:right">₹${item.unit_price * item.quantity}</td>
</tr>`
      )
      .join("");

    win.document.write(`
<html>
<head>
<title>ICEPOS Receipt</title>
<style>
body{font-family:monospace;width:280px;padding:8px;font-size:12px;}
.center{text-align:center;}
.title{font-size:18px;font-weight:bold;}
table{width:100%}
</style>
</head>
<body>

<div class="center">
  <img src="${baseUrl}/logo.png" style="width:120px;margin-bottom:4px;" />
</div>

<div class="center title">ICE SPOT</div>
<hr/>

<div>Date: ${now.toLocaleString()}</div>
<div>Bill No: ${invoice || "-"}</div>
<div>Payment: ${payment}</div>

<hr/>
<table>${rows}</table>
<hr/>

<h2 style="text-align:right">₹${total}</h2>

</body>
</html>
`);

    win.document.close();
    win.focus();
    win.onload = () => {
      win.print();
      win.close();
    };
  }

  /* ================= UI ================= */

  return (
    <div
  style={{
  display: "grid",
  gridTemplateColumns: "1fr 380px",
  height: "100vh",
  background:
    "radial-gradient(circle at 20% 20%, #111827, #020617 55%, #020617)",
}}
    >
      {/* LEFT PANEL */}
      <div
  style={{
    padding: 28,
    overflowY: "auto",
    color: "#e2e8f0",
  }}
>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>
  ICEPOS Billing
</h1>
{(outCount > 0 || criticalCount > 0 || lowCount > 0) && (
  <div
    style={{
      padding: 12,
      marginBottom: 16,
      borderRadius: 10,
      background: "#fff",
      border: "1px solid #ddd",
      fontWeight: 600,
    }}
  >
    ⚠ Stock Alerts →
    {outCount > 0 && (
      <span style={{ color: "#b91c1c", marginLeft: 10 }}>
        {outCount} Out
      </span>
    )}
    {criticalCount > 0 && (
      <span style={{ color: "#ef4444", marginLeft: 10 }}>
        {criticalCount} Critical
      </span>
    )}
    {lowCount > 0 && (
      <span style={{ color: "#f59e0b", marginLeft: 10 }}>
        {lowCount} Low
      </span>
    )}
  </div>
)}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setActiveCat("ALL")} style={pill(activeCat === "ALL")}>
            ALL
          </button>

          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)} style={pill(activeCat === c)}>
              {c}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))",
            gap: 10,
          }}
        >
          {filtered.map((p) => {
            const qty = getQty(p.id);
         const { isOut, isLow, isCritical } = getStockState(p);

            return (
              <div
                key={p.id}
               style={{
  ...tile,
  border: isOut
    ? "2px solid #dc2626"
    : isLow
    ? "2px solid #f59e0b"
    : "1px solid rgba(255,255,255,0.05)",

  background: isOut
    ? "#3f1d1d"
    : isLow
    ? "#3f331d"
    : "#1e293b",
 boxShadow: "0 8px 20px rgba(0,0,0,0.4)",

  transition: "all 0.2s ease",
}}
              >
<div
  style={{
    fontWeight: 700,
    color: "#ffffff",
    fontSize: 16,
    lineHeight: "20px",
    marginBottom: 6,
  }}
>
  {p.name}
</div>
<div style={{ color: "#94a3b8", marginTop: 4 }}>
  ₹{p.price}
</div>

               {isOut && (
  <div style={{ color: "#b91c1c", fontWeight: 800 }}>
    OUT OF STOCK
  </div>
)}

{isCritical && (
  <div style={{ color: "#ef4444", fontWeight: 800 }}>
    ⚠ CRITICAL STOCK
  </div>
)}

{!isCritical && isLow && (
  <div style={{ color: "#b45309", fontWeight: 700 }}>
    ⚠ Low Stock
  </div>
)}

                <div style={qtyBar}>
                  <button onClick={() => decrement(p.id)} style={qtyBtn}>−</button>
                  <div style={{ color: "#f8fafc", fontWeight: 600 }}>
  {qty}
</div>
                <button
  disabled={isOut || qty >= p.current_stock}
  onClick={() => addToCart(p)}
  style={{
    ...qtyBtn,
    opacity: isOut || qty >= p.current_stock ? 0.4 : 1,
    cursor:
      isOut || qty >= p.current_stock
        ? "not-allowed"
        : "pointer",
  }}
>
+
</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
       style={{
  borderLeft: "1px solid rgba(255,255,255,0.08)",
  padding: 22,
  display: "flex",
  flexDirection: "column",
  background: "rgba(15, 23, 42, 0.55)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)",
}}
      >
        <div
          style={{
  padding: 14,
  marginBottom: 14,
  background: shiftOpen
    ? "linear-gradient(135deg,#020617,#0f172a)"
    : "linear-gradient(135deg,#3f1d1d,#7f1d1d)",
  color: "#fff",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
}}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>ICE SPOT</div>
          <div style={{ fontSize: 12 }}>{me?.name || "Staff"}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>₹{todayTotal}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            {shiftOpen ? "Today Sales" : "SHIFT CLOSED"}
          </div>
        </div>

        {shiftOpen && (
          <button onClick={closeShift} style={dangerBtn}>
            🔒 Close Shift
          </button>
        )}

        <button onClick={logout} style={logoutBtn}>
          🚪 Logout
        </button>

        {!shiftOpen && (
          <button onClick={openShift} style={openBtn}>
            🟢 Open Shift
          </button>
        )}

        {lastBill && (
          <button onClick={reprintLastBill} style={reprintBtn}>
            🧾 Reprint Last Bill
          </button>
        )}

        <h2 style={{ color: "#f8fafc" }}>Cart</h2>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {cart.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <b style={{ color: "#f8fafc" }}>{item.name}</b>
              <div>
                {item.quantity} × ₹{item.unit_price}
                <button onClick={() => removeItem(i)} style={{ marginLeft: 8 }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <h1>₹{total}</h1>

        <select
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          style={{ padding: 12 }}
        >
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
        </select>

        <button
          onClick={placeOrder}
          disabled={loading || !shiftOpen}
          style={{ ...payBtn, opacity: !shiftOpen ? 0.5 : 1 }}
        >
          {!shiftOpen
            ? "Shift Closed"
            : loading
            ? "Processing..."
            : "Place Order"}
        </button>
      </div>
{showOpenModal && (
  <div style={modalOverlay}>
    <div style={modalBox}>
      <h3>Enter Opening Cash</h3>

      <input
        type="number"
        value={openingCash}
        onChange={(e) => setOpeningCash(e.target.value)}
        style={inputStyle}
        placeholder="Opening Cash"
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={confirmOpenShift} style={openBtn}>
          Start Shift
        </button>

        <button
          onClick={() => setShowOpenModal(false)}
          style={logoutBtn}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
{showCloseModal && (
  <div style={modalOverlay}>
    <div style={modalBox}>
      <h3>Enter Counted Cash</h3>

      <input
        type="number"
        value={closingCash}
        onChange={(e) => setClosingCash(e.target.value)}
        style={inputStyle}
        placeholder="Counted Cash"
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={confirmCloseShift} style={dangerBtn}>
          Confirm Close
        </button>

        <button
          onClick={() => setShowCloseModal(false)}
          style={logoutBtn}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );

}

/* ================= STYLES ================= */

const pill = (active: boolean): React.CSSProperties => ({
  marginRight: 10,
  marginBottom: 10,
  padding: "10px 18px",
  borderRadius: 30,
  border: active
    ? "1px solid #38bdf8"
    : "1px solid rgba(255,255,255,0.1)",
  background: active ? "#38bdf8" : "#1e293b",
  color: active ? "#0f172a" : "#e2e8f0",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
});

const tile: React.CSSProperties = {
  borderRadius: 20,
  padding: 18,
  background: "rgba(30, 41, 59, 0.55)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow:
    "0 10px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  transition: "all 0.22s ease",
};
const qtyBar: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const qtyBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0f172a",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const reprintBtn: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  background: "#1e293b",
  color: "#38bdf8",
  borderRadius: 12,
  fontWeight: 600,
  border: "1px solid #38bdf8",
};

const logoutBtn: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  background: "#334155",
  color: "#fff",
  borderRadius: 12,
  fontWeight: 600,
};

const openBtn: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  color: "#fff",
  borderRadius: 12,
  fontWeight: 800,
  border: "none",
  boxShadow: "0 8px 18px rgba(34,197,94,0.35)",
  cursor: "pointer",
};
const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
};

const modalBox: React.CSSProperties = {
  background: "rgba(15,23,42,0.85)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  padding: 26,
  borderRadius: 16,
  width: 300,
  textAlign: "center",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "#020617",
  color: "#fff",
  marginTop: 10,
};
const dangerBtn: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  background: "linear-gradient(135deg,#ef4444,#b91c1c)",
  color: "#fff",
  borderRadius: 12,
  fontWeight: 800,
  border: "none",
  boxShadow: "0 8px 18px rgba(239,68,68,0.35)",
  cursor: "pointer",
};
const payBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 16,
  padding: 20,
  fontSize: 20,
  fontWeight: 900,
  background: "linear-gradient(135deg,#38bdf8,#0ea5e9)",
  color: "#020617",
  borderRadius: 16,
  border: "none",
  boxShadow: "0 12px 30px rgba(56,189,248,0.45)",
  cursor: "pointer",
  letterSpacing: 0.5,
};
"use client";

import { useEffect, useMemo, useState } from "react";
// ✅ Use react-window v1 stable API
import { FixedSizeList as List } from "react-window";

// =====================================================
// ADVANCED STOCK DASHBOARD (STABLE BUILD)
// =====================================================

export default function StockSummaryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    load();
  }, []);

 async function load() {
  try {
    setLoading(true);

    const res = await fetch("/api/reports/stock-summary");

    // 🛡️ handle non-JSON safely
    const text = await res.text();

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("Stock summary returned non-JSON:", text);
      throw new Error("API did not return valid JSON");
    }

    setData(json);
  } catch (err) {
    console.error("LOAD STOCK FAILED", err);
    setData(null);
  } finally {
    setLoading(false);
  }
}

  // ================= categories =================
const [categories, setCategories] = useState<string[]>([]);

  // ================= filtering =================
  const filtered = useMemo(() => {
    if (!data?.products) return [];

    return data.products.filter((p: any) => {
      const matchSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());

      const matchCat = category === "ALL" || p.category_name === category;

      return matchSearch && matchCat;
    });
  }, [data, search, category]);

  // ================= sparkline =================
  const sparkData = useMemo(() => {
    if (!data?.products) return [];
    return data.products.slice(0, 20).map((p: any) => p.current_stock || 0);
  }, [data]);

  // ================= export =================
  function exportCSV() {
    if (!data?.products) return;

    const headers = ["SKU", "Name", "Category", "Stock", "Reorder Level"];

    const rows = data.products.map((p: any) => [
      p.sku,
      p.name,
      p.category_name,
      p.current_stock,
      p.reorder_level,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-summary.csv";
    a.click();
  }

  if (loading) return <div style={wrap}>Loading inventory…</div>;
  if (!data) return <div style={wrap}>Failed to load data</div>;

  const s = data.summary || {};

  return (
    <div style={wrap}>
      {/* HEADER */}
      <div style={headerRow}>
        <h1 style={title}>📦 Stock Summary</h1>

        <div style={controls}>
          <input
            placeholder="Search product or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchBox}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={filter}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <button onClick={exportCSV} style={exportBtn}>
            📥 Export Excel
          </button>
        </div>
      </div>

      {/* SPARKLINE */}
      <div style={sparkWrap}>
        <MiniSparkline data={sparkData} />
      </div>

      {/* KPI */}
      <div style={cardGrid}>
        <Card title="Total Products" value={s.total_products || 0} />
        <Card title="Total Quantity" value={s.total_quantity || 0} />
        <Card title="Low Stock" value={s.low_stock || 0} warn />
        <Card title="Out of Stock" value={s.out_of_stock || 0} danger />
      </div>

      {/* TABLE */}
      <div style={tableWrap}>
        <div style={theadRow}>
          <div style={colSku}>SKU</div>
          <div style={colName}>Name</div>
          <div style={col}>Category</div>
          <div style={col}>Stock</div>
          <div style={col}>Reorder</div>
          <div style={col}>Status</div>
        </div>

        {filtered && filtered.length > 0 ? (
          <List
            height={520}
            itemCount={filtered.length}
            itemSize={44}
            width="100%"
          >
            {({ index, style }: any) => {
              const p = filtered[index];
              if (!p) return null;

              const status =
                p.current_stock <= 0
                  ? "OUT"
                  : p.reorder_level > 0 && p.current_stock <= p.reorder_level
                  ? "LOW"
                  : "OK";

              return (
                <div
                  style={{
                    ...style,
                    ...rowStyle,
                    background:
                      status === "OUT"
                        ? "rgba(220,38,38,0.08)"
                        : status === "LOW"
                        ? "rgba(245,158,11,0.08)"
                        : index % 2
                        ? "rgba(255,255,255,0.02)"
                        : "transparent",
                  }}
                >
                  <div style={colSku}>{p.sku}</div>
                  <div style={colName}>{p.name}</div>
                  <div style={col}>{p.category_name}</div>
                  <div style={col}>{p.current_stock}</div>
                  <div style={col}>{p.reorder_level}</div>
                  <div style={col}>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            }}
          </List>
        ) : (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.6 }}>
            No products found
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Mini sparkline
// =====================================================
function MiniSparkline({ data }: { data: number[] }) {
  if (!data?.length) return null;

  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => `${i * 10},${40 - (v / max) * 40}`)
    .join(" ");

  return (
    <svg width="100%" height="40">
      <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={points} />
    </svg>
  );
}

function Card({ title, value, warn, danger }: any) {
  const bg = danger
    ? "linear-gradient(135deg,#7f1d1d,#b91c1c)"
    : warn
    ? "linear-gradient(135deg,#78350f,#f59e0b)"
    : "linear-gradient(135deg,#1e293b,#334155)";

  return (
    <div style={{ ...card, background: bg }}>
      <div style={cardTitle}>{title}</div>
      <div style={cardValue}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    OK: { bg: "#065f46", text: "#34d399" },
    LOW: { bg: "#78350f", text: "#fbbf24" },
    OUT: { bg: "#7f1d1d", text: "#f87171" },
  };

  const s = map[status] || map.OK;

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: s.bg,
        color: s.text,
      }}
    >
      {status}
    </span>
  );
}

// =====================================================
// styles
// =====================================================
const wrap: React.CSSProperties = {
  padding: 24,
  background: "#020617",
  minHeight: "100vh",
  color: "#e2e8f0",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 12,
};

const controls: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const title: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 800,
};

const searchBox: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#020617",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
};

const filter: React.CSSProperties = { ...searchBox };

const exportBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#2563eb",
  color: "white",
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};

const sparkWrap: React.CSSProperties = {
  background: "#020617",
  padding: 10,
  borderRadius: 12,
  marginBottom: 16,
  border: "1px solid rgba(255,255,255,0.06)",
};

const cardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
  marginBottom: 20,
};

const card: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  boxShadow: "0 15px 35px rgba(0,0,0,0.45)",
};

const cardTitle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
};

const cardValue: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  marginTop: 6,
};

const tableWrap: React.CSSProperties = {
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
};

const theadRow: React.CSSProperties = {
  display: "flex",
  background: "#020617",
  color: "#94a3b8",
  fontSize: 13,
  padding: "10px 0",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};

const col: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
};

const colSku: React.CSSProperties = {
  ...col,
  fontFamily: "monospace",
};

const colName: React.CSSProperties = {
  ...col,
  fontWeight: 600,
};

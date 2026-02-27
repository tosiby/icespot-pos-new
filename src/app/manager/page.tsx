"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";

/* ── Types ────────────────────────────────────────────────────── */
type Product = {
  id: string; sku: string; name: string;
  current_stock: number; reorder_level: number; category_name: string;
};
type StockSummary = {
  total_products: number; total_quantity: number;
  low_stock: number; out_of_stock: number;
};
type Tab = "stock" | "reports";

/* ── Main ─────────────────────────────────────────────────────── */
export default function ManagerPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [todaySales, setTodaySales] = useState<any>(null);
  const [shiftStatus, setShiftStatus] = useState<any>(null);
  const [staffToday, setStaffToday] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "LOW" | "OUT" | "OK">("ALL");
  const [me, setMe] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json().then(setMe) : null),
      fetch("/api/reports/stock-summary").then(r => r.ok ? r.json().then((d: any) => {
        setProducts(d.products ?? []);
        setSummary(d.summary ?? null);
      }) : null),
      fetch("/api/reports/today").then(r => r.ok ? r.json().then(setTodaySales) : null),
      fetch("/api/reports/shift-status").then(r => r.ok ? r.json().then(setShiftStatus) : null),
      fetch("/api/reports/staff-today").then(r => r.ok ? r.json().then(setStaffToday) : null),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function getStockState(p: Product) {
    const isOut = p.current_stock <= 0;
    const isCritical = !isOut && p.reorder_level > 0 && p.current_stock <= Math.ceil(p.reorder_level * 0.5);
    const isLow = !isOut && !isCritical && p.reorder_level > 0 && p.current_stock <= p.reorder_level;
    return { isOut, isCritical, isLow };
  }

  const filtered = products
    .filter(p => {
      const s = getStockState(p);
      if (filterStatus === "OUT") return s.isOut;
      if (filterStatus === "LOW") return s.isLow || s.isCritical;
      if (filterStatus === "OK") return !s.isOut && !s.isLow && !s.isCritical;
      return true;
    })
    .filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const sa = getStockState(a), sb = getStockState(b);
      const pri = (s: any) => s.isOut ? 0 : s.isCritical ? 1 : s.isLow ? 2 : 3;
      return pri(sa) - pri(sb);
    });

  const outCount = products.filter(p => getStockState(p).isOut).length;
  const critCount = products.filter(p => getStockState(p).isCritical).length;
  const lowCount = products.filter(p => getStockState(p).isLow).length;

  if (loading) return (
    <div style={S.loadWrap}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🧊</div>
      <div style={{ color: "#64748b", fontSize: 14 }}>Loading…</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#06090f; --surface:rgba(255,255,255,0.035); --surface-2:rgba(255,255,255,0.06);
          --border:rgba(255,255,255,0.07); --border-bright:rgba(0,210,255,0.28);
          --ice:#00d4ff; --ice-dim:rgba(0,212,255,0.12); --green:#34d399; --green-dim:rgba(52,211,153,0.12);
          --amber:#fbbf24; --amber-dim:rgba(251,191,36,0.12); --red:#f87171; --red-dim:rgba(248,113,113,0.12);
          --orange:#fb923c; --purple:#a78bfa; --text:#e2e8f0; --text-dim:#64748b; --text-muted:#2d3f55;
        }
        html,body{background:var(--bg);height:100%}
        .mgr-root{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
        .topbar{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:56px;background:rgba(6,9,15,0.9);border-bottom:1px solid var(--border);backdrop-filter:blur(24px);flex-shrink:0}
        .brand{display:flex;align-items:center;gap:10px}
        .brand-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--ice),#0099bb);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .brand-name{font-size:15px;font-weight:700;letter-spacing:1.5px;color:#fff}
        .brand-sub{font-size:10px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase}
        .topbar-right{display:flex;align-items:center;gap:8px}
        .nav-btn{padding:5px 13px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:5px;transition:all 0.15s}
        .nav-btn:hover{background:var(--surface-2);color:var(--text);border-color:var(--border-bright)}
        .nav-btn-primary{background:var(--ice-dim);border-color:var(--border-bright);color:var(--ice);font-weight:600}

        .body{display:flex;flex:1;overflow:hidden}
        .sidebar{width:190px;flex-shrink:0;background:rgba(255,255,255,0.02);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:16px 0}
        .tab-btn{display:flex;align-items:center;gap:9px;padding:10px 14px;border:none;background:none;color:var(--text-dim);font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;width:100%;text-align:left;transition:all 0.15s;border-radius:0}
        .tab-btn.active{background:rgba(0,212,255,0.1);color:var(--ice);font-weight:600;border-right:2px solid var(--ice)}
        .tab-btn:hover:not(.active){background:rgba(255,255,255,0.03);color:var(--text)}
        .side-footer{margin-top:auto;padding:16px 14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
        .side-link{font-size:11px;color:var(--text-dim);text-decoration:none;transition:color 0.15s}
        .side-link:hover{color:var(--text)}

        .main{flex:1;overflow-y:auto;padding:28px}
        .page-title{font-size:20px;font-weight:800;color:#fff;margin-bottom:4px}
        .page-sub{font-size:12px;color:var(--text-dim);margin-bottom:24px}

        .kpi-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:24px}
        .kpi{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px}
        .kpi-icon{font-size:20px;margin-bottom:6px}
        .kpi-label{font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
        .kpi-val{font-family:'DM Mono',monospace;font-size:24px;font-weight:700}

        .controls{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
        .search-inp{flex:1;min-width:200px;padding:9px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'Outfit',sans-serif;font-size:13px;outline:none;transition:border-color 0.15s}
        .search-inp:focus{border-color:var(--border-bright)}
        .search-inp::placeholder{color:var(--text-muted)}
        .filter-btn{padding:8px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s}
        .filter-btn.active{background:var(--ice-dim);border-color:var(--border-bright);color:var(--ice)}
        .filter-btn.f-low.active{background:var(--amber-dim);border-color:rgba(251,191,36,0.3);color:var(--amber)}
        .filter-btn.f-out.active{background:var(--red-dim);border-color:rgba(248,113,113,0.3);color:var(--red)}
        .filter-btn.f-ok.active{background:var(--green-dim);border-color:rgba(52,211,153,0.3);color:var(--green)}

        .stock-table{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}
        .st-head{display:grid;grid-template-columns:1fr 80px 90px 100px 70px 90px;gap:8px;padding:11px 16px;background:rgba(255,255,255,0.03);font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)}
        .st-row{display:grid;grid-template-columns:1fr 80px 90px 100px 70px 90px;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);align-items:center;transition:background 0.1s}
        .st-row:hover{background:rgba(255,255,255,0.02)}
        .st-row:last-child{border-bottom:none}
        .prod-name{font-size:13px;font-weight:600;color:var(--text)}
        .prod-sku{font-family:'DM Mono',monospace;font-size:10px;color:var(--text-dim);margin-top:2px}
        .stock-bar-wrap{display:flex;align-items:center;gap:6px}
        .stock-bar{height:4px;border-radius:2px;flex:1;background:rgba(255,255,255,0.06)}
        .stock-pill{font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px}
        .pill-out{background:var(--red-dim);color:var(--red);border:1px solid rgba(248,113,113,0.3)}
        .pill-crit{background:rgba(249,115,22,0.12);color:#fb923c;border:1px solid rgba(249,115,22,0.3)}
        .pill-low{background:var(--amber-dim);color:var(--amber);border:1px solid rgba(251,191,36,0.3)}
        .pill-ok{background:var(--green-dim);color:var(--green);border:1px solid rgba(52,211,153,0.3)}
        .cat-tag{font-size:10px;color:var(--text-muted);background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:4px;padding:2px 6px}

        .reports-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px}
        .card-title{font-size:12px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px}
        .rep-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px}
        .rep-row:last-child{border-bottom:none}
        .rep-label{color:var(--text-dim)}
        .pay-bar-wrap{margin-bottom:14px}
        .pay-bar-top{display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px}
        .pay-track{height:6px;border-radius:3px;background:rgba(255,255,255,0.06)}
        .pay-fill{height:100%;border-radius:3px;transition:width 0.5s}

        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:11px 18px;border-radius:10px;font-size:13px;font-weight:500;z-index:99999;display:flex;align-items:center;gap:7px;backdrop-filter:blur(20px);white-space:nowrap;box-shadow:0 8px 30px rgba(0,0,0,0.5)}
        .toast-success{background:rgba(6,55,40,0.95);border:1px solid rgba(52,211,153,0.4);color:var(--green)}
        .toast-error{background:rgba(60,10,10,0.95);border:1px solid rgba(248,113,113,0.4);color:var(--red)}
        .toast-info{background:rgba(7,18,38,0.95);border:1px solid var(--border-bright);color:var(--ice)}
      `}</style>

      <div className="mgr-root">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-icon">🧊</div>
            <div>
              <div className="brand-name">ICEPOS</div>
              <div className="brand-sub">Manager</div>
            </div>
          </div>
          <div className="topbar-right">
            {me?.name && <span style={{ fontSize: 12, color: "#64748b" }}>👤 {me.name}</span>}
            <a href="/billing" className="nav-btn nav-btn-primary">⚡ Billing</a>
            <a href="/dashboard" className="nav-btn">📊 Dashboard</a>
            <button className="nav-btn" style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }}
              onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}>
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="body">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <button className={`tab-btn ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>
              <span>📦</span> Stock & Products
            </button>
            <button className={`tab-btn ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>
              <span>📊</span> Today's Reports
            </button>
            <div className="side-footer">
              <a href="/purchase/upload" className="side-link">📤 Upload Stock</a>
              <a href="/shift-history" className="side-link">📁 Shift History</a>
              <button onClick={load} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: "#64748b", textAlign: "left", fontFamily: "Outfit,sans-serif" }}>
                ↻ Refresh
              </button>
            </div>
          </aside>

          {/* MAIN */}
          <main className="main">

            {/* ══ STOCK TAB ══════════════════════════════════════ */}
            {tab === "stock" && (
              <>
                <div className="page-title">📦 Stock & Products</div>
                <div className="page-sub">{products.length} products · Live inventory view</div>

                {/* KPI row */}
                <div className="kpi-row">
                  <div className="kpi">
                    <div className="kpi-icon">📦</div>
                    <div className="kpi-label">Total Products</div>
                    <div className="kpi-val" style={{ color: "var(--ice)" }}>{summary?.total_products ?? 0}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-icon">🔢</div>
                    <div className="kpi-label">Total Units</div>
                    <div className="kpi-val" style={{ color: "var(--green)" }}>{summary?.total_quantity ?? 0}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-icon">⚠️</div>
                    <div className="kpi-label">Low Stock</div>
                    <div className="kpi-val" style={{ color: "var(--amber)" }}>{lowCount + critCount}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-icon">✕</div>
                    <div className="kpi-label">Out of Stock</div>
                    <div className="kpi-val" style={{ color: "var(--red)" }}>{outCount}</div>
                  </div>
                </div>

                {/* Filters */}
                <div className="controls">
                  <input
                    className="search-inp"
                    placeholder="Search name or SKU…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {(["ALL", "LOW", "OUT", "OK"] as const).map(f => (
                    <button
                      key={f}
                      className={`filter-btn f-${f.toLowerCase()} ${filterStatus === f ? "active" : ""}`}
                      onClick={() => setFilterStatus(f)}
                    >
                      {f === "ALL" ? `All (${products.length})` : f === "LOW" ? `⚠ Low (${lowCount + critCount})` : f === "OUT" ? `✕ Out (${outCount})` : `✓ OK`}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div className="stock-table">
                  <div className="st-head">
                    <div>Product</div>
                    <div>Category</div>
                    <div>Stock</div>
                    <div>Stock Level</div>
                    <div>Reorder</div>
                    <div>Status</div>
                  </div>
                  {filtered.length === 0 && (
                    <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No products match</div>
                  )}
                  {filtered.map(p => {
                    const { isOut, isCritical, isLow } = getStockState(p);
                    const pct = p.reorder_level > 0 ? Math.min(100, Math.round((p.current_stock / (p.reorder_level * 2)) * 100)) : 100;
                    const barColor = isOut ? "#f87171" : isCritical ? "#fb923c" : isLow ? "#fbbf24" : "#34d399";
                    return (
                      <div key={p.id} className="st-row">
                        <div>
                          <div className="prod-name">{p.name}</div>
                          <div className="prod-sku">{p.sku}</div>
                        </div>
                        <div><span className="cat-tag">{p.category_name}</span></div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: barColor }}>
                          {p.current_stock}
                        </div>
                        <div className="stock-bar-wrap">
                          <div className="stock-bar">
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: barColor }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--text-dim)" }}>
                          {p.reorder_level || "—"}
                        </div>
                        <div>
                          <span className={`stock-pill ${isOut ? "pill-out" : isCritical ? "pill-crit" : isLow ? "pill-low" : "pill-ok"}`}>
                            {isOut ? "OUT" : isCritical ? "CRITICAL" : isLow ? "LOW" : "OK"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ══ REPORTS TAB ════════════════════════════════════ */}
            {tab === "reports" && (
              <>
                <div className="page-title">📊 Today's Reports</div>
                <div className="page-sub">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>

                {/* Shift status banner */}
                <div style={{
                  padding: "12px 18px", borderRadius: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
                  background: shiftStatus?.open ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                  border: `1px solid ${shiftStatus?.open ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                }}>
                  <span style={{ fontSize: 18 }}>{shiftStatus?.open ? "🟢" : "🔴"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: shiftStatus?.open ? "#34d399" : "#f87171" }}>
                      Shift {shiftStatus?.open ? "Currently Open" : "Closed"}
                    </div>
                    {shiftStatus?.expected_cash !== undefined && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        Expected cash in drawer: ₹{shiftStatus.expected_cash}
                      </div>
                    )}
                  </div>
                </div>

                <div className="reports-grid">
                  {/* Sales today */}
                  <div className="card">
                    <div className="card-title">💰 Sales Today</div>
                    <div className="rep-row">
                      <span className="rep-label">Total Revenue</span>
                      <b style={{ fontFamily: "'DM Mono',monospace", color: "#00d4ff", fontSize: 16 }}>₹{Number(todaySales?.total || 0).toFixed(2)}</b>
                    </div>
                  </div>

                  {/* Payment breakdown */}
                  <div className="card">
                    <div className="card-title">💳 Payment Breakdown</div>
                    {[
                      { label: "Cash 💵", value: staffToday?.cash || 0, color: "#34d399" },
                      { label: "UPI 📲", value: staffToday?.upi || 0, color: "#00d4ff" },
                      { label: "Card 💳", value: staffToday?.card || 0, color: "#a78bfa" },
                    ].map(item => {
                      const total = (staffToday?.total || 0);
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <div key={item.label} className="pay-bar-wrap">
                          <div className="pay-bar-top">
                            <span style={{ color: "#94a3b8" }}>{item.label}</span>
                            <span style={{ color: item.color, fontWeight: 700 }}>₹{Number(item.value).toFixed(0)} <span style={{ color: "#475569" }}>({pct}%)</span></span>
                          </div>
                          <div className="pay-track">
                            <div className="pay-fill" style={{ width: `${pct}%`, background: item.color }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="rep-row" style={{ marginTop: 8 }}>
                      <span className="rep-label">Total Bills</span>
                      <b style={{ color: "#e2e8f0" }}>{staffToday?.count || 0}</b>
                    </div>
                  </div>

                  {/* Low stock alerts */}
                  <div className="card">
                    <div className="card-title">⚠️ Low Stock Alerts</div>
                    {products.filter(p => { const s = getStockState(p); return s.isLow || s.isCritical; }).slice(0, 8).map(p => {
                      const { isCritical } = getStockState(p);
                      return (
                        <div key={p.id} className="rep-row">
                          <span className="rep-label">{p.name}</span>
                          <span style={{ color: isCritical ? "#fb923c" : "#fbbf24", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                            {p.current_stock} left
                          </span>
                        </div>
                      );
                    })}
                    {products.filter(p => { const s = getStockState(p); return s.isLow || s.isCritical; }).length === 0 && (
                      <div style={{ fontSize: 13, color: "var(--green)", padding: "8px 0" }}>✓ All stock levels OK</div>
                    )}
                  </div>

                  {/* Out of stock */}
                  <div className="card">
                    <div className="card-title">✕ Out of Stock</div>
                    {products.filter(p => getStockState(p).isOut).slice(0, 8).map(p => (
                      <div key={p.id} className="rep-row">
                        <span className="rep-label">{p.name}</span>
                        <span style={{ color: "#f87171", fontWeight: 700, fontSize: 11 }}>OUT</span>
                      </div>
                    ))}
                    {outCount === 0 && (
                      <div style={{ fontSize: 13, color: "var(--green)", padding: "8px 0" }}>✓ No items out of stock</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"} {toast.msg}
        </div>
      )}
    </>
  );
}
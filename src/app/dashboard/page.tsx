"use client";

import { useEffect, useState, useCallback } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ZData = { totalSales?: number; cash?: number; upi?: number; card?: number; billCount?: number; topItems?: { name: string; qty: number }[] };
type StaffToday = { cash?: number; upi?: number; card?: number; total?: number; count?: number };
type LastBill = { invoice_number?: string; created_at?: string; total_amount?: number; items?: { name: string; quantity: number; total: number }[] };
type LowStockItem = { product: { id: string; name: string }; current_stock: number };
type ShiftStatus = { open?: boolean; expected_cash?: number };
type LiveShift = { opening_cash?: number; cash_sales?: number; upi_sales?: number; total_sales?: number; expected_cash?: number };
type LastClosed = { opening_cash?: number; expected_cash?: number; closing_cash?: number; difference?: number; total_sales?: number; cash_sales?: number; upi_sales?: number };

type HourlySlot = { hour: number; label: string; total: number; count: number; cash: number; upi: number; card: number };
type HourlyData = { slots: HourlySlot[]; peak: { hour: number; label: string; total: number }; total_today: number; total_bills: number };

type ShiftPerf = {
  id: string; label: string; time_label: string; opened_at: string; closed_at: string;
  duration_mins: number | null; total_sales: number; cash_sales: number; upi_sales: number;
  difference: number; bill_count: number; avg_bill: number; opening_cash: number; expected_cash: number; closing_cash: number;
};
type ShiftPerfData = {
  shifts: ShiftPerf[];
  summary: { total_revenue: number; avg_per_shift: number; best_shift: ShiftPerf; total_bills: number; shift_count: number } | null;
};

/* ─── SVG Hourly Bar Chart ────────────────────────────────────────────────── */

function HourlyChart({ slots }: { slots: HourlySlot[] }) {
  const W = 100, H = 72; // viewBox units
  const PAD_L = 6, PAD_R = 2, PAD_T = 4, PAD_B = 14;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  if (!slots || slots.length === 0) {
    return <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>No sales data yet today</div>;
  }

  const maxVal = Math.max(...slots.map((s) => s.total), 1);
  const barW = Math.max((chartW / slots.length) * 0.6, 0.5);
  const gap = chartW / slots.length;
  const peak = slots.reduce((m, s) => (s.total > m.total ? s : m), slots[0]);

  // Y axis grid lines
  const gridLines = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "42%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="bar-ice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0099bb" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="bar-peak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
          </linearGradient>
          <filter id="bar-glow">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines.map((pct) => {
          const y = PAD_T + chartH * (1 - pct);
          return (
            <line
              key={pct}
              x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.3"
            />
          );
        })}

        {/* Bars */}
        {slots.map((s, i) => {
          const barH = Math.max((s.total / maxVal) * chartH, s.total > 0 ? 1 : 0);
          const x = PAD_L + i * gap + (gap - barW) / 2;
          const y = PAD_T + chartH - barH;
          const isPeak = s.hour === peak.hour && peak.total > 0;

          return (
            <g key={s.hour}>
              {/* Bar background track */}
              <rect
                x={x} y={PAD_T} width={barW} height={chartH}
                fill="rgba(255,255,255,0.03)" rx="0.5"
              />
              {/* Actual bar */}
              {s.total > 0 && (
                <rect
                  x={x} y={y} width={barW} height={barH}
                  fill={isPeak ? "url(#bar-peak)" : "url(#bar-ice)"}
                  rx="0.5"
                  filter={isPeak ? "url(#bar-glow)" : undefined}
                />
              )}
              {/* Hour label */}
              {(i % 2 === 0 || slots.length <= 8) && (
                <text
                  x={x + barW / 2} y={H - 2}
                  textAnchor="middle"
                  fontSize="2.8"
                  fill={isPeak ? "#34d399" : "rgba(100,116,139,0.8)"}
                  fontFamily="'DM Mono', monospace"
                >
                  {s.label}
                </text>
              )}
              {/* Value on peak */}
              {isPeak && s.total > 0 && (
                <text
                  x={x + barW / 2} y={y - 1.5}
                  textAnchor="middle"
                  fontSize="2.5"
                  fill="#34d399"
                  fontFamily="'DM Mono', monospace"
                  fontWeight="bold"
                >
                  ₹{s.total >= 1000 ? `${(s.total / 1000).toFixed(1)}k` : s.total}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── SVG Shift Performance Chart ────────────────────────────────────────── */

function ShiftPerfChart({ shifts }: { shifts: ShiftPerf[] }) {
  const W = 100, H = 60;
  const PAD_L = 8, PAD_R = 2, PAD_T = 6, PAD_B = 14;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  if (!shifts || shifts.length === 0) {
    return <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>No closed shift data yet</div>;
  }

  const maxVal = Math.max(...shifts.map((s) => s.total_sales), 1);
  const barW = Math.max((chartW / shifts.length) * 0.55, 0.8);
  const gap = chartW / shifts.length;

  // Spline line for avg bill
  const maxAvg = Math.max(...shifts.map((s) => s.avg_bill), 1);

  const linePoints = shifts.map((s, i) => {
    const x = PAD_L + i * gap + gap / 2;
    const y = PAD_T + chartH * (1 - s.avg_bill / maxAvg);
    return `${x},${y}`;
  });

  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "36%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="perf-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="perf-best" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0.5, 1.0].map((pct) => (
          <line
            key={pct}
            x1={PAD_L} y1={PAD_T + chartH * (1 - pct)}
            x2={W - PAD_R} y2={PAD_T + chartH * (1 - pct)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.3"
          />
        ))}

        {/* Bars */}
        {shifts.map((s, i) => {
          const barH = Math.max((s.total_sales / maxVal) * chartH, s.total_sales > 0 ? 1.5 : 0);
          const x = PAD_L + i * gap + (gap - barW) / 2;
          const y = PAD_T + chartH - barH;
          const isBest = s.total_sales === maxVal;

          return (
            <g key={s.id}>
              <rect
                x={x} y={PAD_T} width={barW} height={chartH}
                fill="rgba(255,255,255,0.025)" rx="0.4"
              />
              {s.total_sales > 0 && (
                <rect
                  x={x} y={y} width={barW} height={barH}
                  fill={isBest ? "url(#perf-best)" : "url(#perf-bar)"}
                  rx="0.4"
                />
              )}
              {/* Date label */}
              <text
                x={x + barW / 2} y={H - 5}
                textAnchor="middle" fontSize="2.4"
                fill={isBest ? "#34d399" : "rgba(100,116,139,0.7)"}
                fontFamily="'DM Mono', monospace"
              >
                {s.label}
              </text>
              <text
                x={x + barW / 2} y={H - 2}
                textAnchor="middle" fontSize="2.0"
                fill="rgba(100,116,139,0.5)"
                fontFamily="'DM Mono', monospace"
              >
                {s.time_label}
              </text>
            </g>
          );
        })}

        {/* Avg bill trend line */}
        {shifts.length > 1 && (
          <polyline
            points={linePoints.join(" ")}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="0.5"
            strokeOpacity="0.6"
            strokeDasharray="1,0.8"
          />
        )}
        {shifts.map((s, i) => {
          const x = PAD_L + i * gap + gap / 2;
          const y = PAD_T + chartH * (1 - s.avg_bill / maxAvg);
          return (
            s.avg_bill > 0 && (
              <circle key={s.id} cx={x} cy={y} r="0.6" fill="#fbbf24" fillOpacity="0.8" />
            )
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Top Products Bar ───────────────────────────────────────────────────── */

function TopProducts({ items }: { items: { name: string; qty: number }[] }) {
  if (!items || items.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>No product data today</div>;
  }
  const top5 = items.slice(0, 5);
  const maxQty = top5[0]?.qty || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {top5.map((item, i) => (
        <div key={item.name}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                background: i === 0 ? "linear-gradient(135deg,#34d399,#059669)" :
                  i === 1 ? "linear-gradient(135deg,#00d4ff,#0099bb)" :
                    "rgba(255,255,255,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 800, color: i < 2 ? "#06090f" : "var(--text-dim)",
                flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                {item.name}
              </span>
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: i === 0 ? "var(--green)" : "var(--text-dim)", fontWeight: 500, flexShrink: 0 }}>
              {item.qty} sold
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(item.qty / maxQty) * 100}%`,
              borderRadius: 3,
              background: i === 0
                ? "linear-gradient(90deg,#34d399,#059669)"
                : i === 1
                  ? "linear-gradient(90deg,#00d4ff,#0099bb)"
                  : `rgba(255,255,255,${0.15 - i * 0.02})`,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Shift Row ──────────────────────────────────────────────────────────── */

function ShiftRow({ s, isBest }: { s: ShiftPerf; isBest: boolean }) {
  const diff = s.difference;
  const diffColor = diff === 0 ? "var(--green)" : diff > 0 ? "var(--amber)" : "var(--red)";
  const diffBg = diff === 0 ? "var(--green-dim)" : diff > 0 ? "var(--amber-dim)" : "var(--red-dim)";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "80px 1fr 70px 60px 60px 60px",
      gap: 8, alignItems: "center",
      padding: "8px 12px",
      background: isBest ? "rgba(52,211,153,0.06)" : "var(--surface)",
      border: `1px solid ${isBest ? "rgba(52,211,153,0.2)" : "var(--border)"}`,
      borderRadius: 8, fontSize: 11,
    }}>
      <div>
        <div style={{ fontWeight: 600, color: isBest ? "var(--green)" : "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
          {isBest && <span style={{ fontSize: 9 }}>⭐</span>}
          {s.label}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{s.time_label}</div>
      </div>
      <div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, color: "var(--text)", fontSize: 13 }}>
          ₹{s.total_sales.toLocaleString("en-IN")}
        </div>
        {s.duration_mins && (
          <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{s.duration_mins >= 60 ? `${Math.floor(s.duration_mins / 60)}h ${s.duration_mins % 60}m` : `${s.duration_mins}m`}</div>
        )}
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", color: "var(--text-dim)", textAlign: "right" }}>
        {s.bill_count} bills
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", color: "var(--text-dim)", textAlign: "right", fontSize: 10 }}>
        ₹{s.avg_bill}
        <div style={{ color: "var(--text-muted)", fontSize: 9 }}>avg</div>
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", color: "var(--text-dim)", textAlign: "right", fontSize: 10 }}>
        <div style={{ color: "rgba(52,211,153,0.8)", fontSize: 10 }}>₹{s.cash_sales}</div>
        <div style={{ color: "rgba(0,212,255,0.7)", fontSize: 10 }}>₹{s.upi_sales}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700,
          padding: "2px 6px", borderRadius: 5,
          background: diffBg, color: diffColor,
        }}>
          {diff >= 0 ? "+" : ""}₹{diff}
        </span>
      </div>
    </div>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<ZData | null>(null);
  const [staffToday, setStaffToday] = useState<StaffToday | null>(null);
  const [lastBill, setLastBill] = useState<LastBill | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [liveShift, setLiveShift] = useState<LiveShift | null>(null);
  const [lastClosed, setLastClosed] = useState<LastClosed | null>(null);
  const [hourly, setHourly] = useState<HourlyData | null>(null);
  const [shiftPerf, setShiftPerf] = useState<ShiftPerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "shifts">("overview");

  useEffect(() => {
    init();
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);

const init = useCallback(async () => {
  setLoading(true);

  try {
    await Promise.all([
      // Z REPORT
      fetch("/api/reports/z").then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setData(data);
      }),

      // STAFF TODAY
      fetch("/api/reports/staff-today").then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setStaffToday(data);
      }),

      // LAST BILL
      fetch("/api/reports/last-bill").then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setLastBill(data);
      }),

      // LOW STOCK
      fetch("/api/reports/low-stock").then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setLowStock(d.items || []);
      }),

      // ⭐⭐⭐ LIVE SHIFT (CRITICAL)
     fetch("/api/reports/shift-live")
  .then(async (r) => {
    if (!r.ok) throw new Error("shift-live failed");
    return r.json();
  })
  .then((d) => {
    const open = !!d?.open;

    setShiftStatus({
      open,
      expected_cash: d?.shift?.expected_cash ?? 0,
    });

    setLiveShift(open ? d.shift : null);
  })
  .catch(() => {
    // fallback safety
    setShiftStatus({ open: false, expected_cash: 0 });
    setLiveShift(null);
  }),
      // ⭐ OPTIONAL — LAST CLOSED SHIFT
      fetch("/api/reports/shift-last-closed").then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setLastClosed(d.shift || null);
      }),
    ]);
  } finally {
    setLoading(false);
  }
}, []);

  function reprintLastBill() {
    if (!lastBill) return;
    const win = window.open("", "PRINT", "height=600,width=320");
    if (!win) return;
    const rows = (lastBill.items || []).map((i) => `<tr><td>${i.name} x${i.quantity}</td><td style="text-align:right">₹${i.total}</td></tr>`).join("");
    win.document.write(`<html><head><style>body{font-family:monospace;width:280px;padding:8px;font-size:12px}table{width:100%}</style></head><body><h3 style="text-align:center">ICE SPOT</h3><hr/><div>Invoice: ${lastBill.invoice_number || "-"}</div><div>Date: ${new Date(lastBill.created_at!).toLocaleString()}</div><hr/><table>${rows}</table><hr/><h2 style="text-align:right">₹${lastBill.total_amount}</h2></body></html>`);
    win.document.close();
    win.print();
  }

  const diffColor = (d: number) => d === 0 ? "#34d399" : d > 0 ? "#fbbf24" : "#f87171";
  const diffBg = (d: number) => d === 0 ? "rgba(52,211,153,0.1)" : d > 0 ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)";
  const diffBorder = (d: number) => d === 0 ? "rgba(52,211,153,0.3)" : d > 0 ? "rgba(251,191,36,0.3)" : "rgba(248,113,113,0.3)";
  const isOpen = shiftStatus?.open;

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #06090f;
          --surface: rgba(255,255,255,0.035);
          --surface-2: rgba(255,255,255,0.055);
          --border: rgba(255,255,255,0.07);
          --border-bright: rgba(0,210,255,0.28);
          --ice: #00d4ff;
          --ice-dim: rgba(0,212,255,0.12);
          --ice-glow: rgba(0,212,255,0.3);
          --green: #34d399;
          --green-dim: rgba(52,211,153,0.12);
          --amber: #fbbf24;
          --amber-dim: rgba(251,191,36,0.12);
          --red: #f87171;
          --red-dim: rgba(248,113,113,0.12);
          --purple: #a78bfa;
          --purple-dim: rgba(167,139,250,0.12);
          --text: #e2e8f0;
          --text-dim: #64748b;
          --text-muted: #334155;
          --radius: 16px;
          --radius-sm: 10px;
        }

        html, body { background: var(--bg); color: var(--text); min-height: 100vh; }

        .dash-root {
          font-family: 'Outfit', sans-serif;
          background: var(--bg); min-height: 100vh; color: var(--text);
          position: relative; overflow-x: hidden;
        }
        .dash-root::before {
          content: ''; position: fixed; top: -300px; left: -200px;
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }
        .dash-root::after {
          content: ''; position: fixed; bottom: -200px; right: -150px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }

        /* TOPBAR */
        .topbar {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 56px;
          background: rgba(6,9,15,0.9); border-bottom: 1px solid var(--border);
          backdrop-filter: blur(24px);
        }
        .topbar-brand { display: flex; align-items: center; gap: 10px; }
        .brand-icon { width: 32px; height: 32px; background: linear-gradient(135deg,var(--ice),#0099bb); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 14px var(--ice-glow); }
        .brand-name { font-size: 15px; font-weight: 700; letter-spacing: 1.5px; color: #fff; }
        .brand-sub { font-size: 10px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; margin-top: -2px; }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .time-chip { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text-dim); background: var(--surface); border: 1px solid var(--border); padding: 4px 10px; border-radius: 20px; }
        .nav-btn { padding: 5px 13px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: none; display: flex; align-items: center; gap: 5px; transition: all 0.15s; }
        .nav-btn:hover { background: var(--surface-2); color: var(--text); border-color: var(--border-bright); }
        .nav-btn-primary { background: var(--ice-dim); border-color: var(--border-bright); color: var(--ice); font-weight: 600; }
        .nav-btn-primary:hover { background: rgba(0,212,255,0.18); }
        .icon-btn { padding: 5px 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .icon-btn:hover { background: var(--surface-2); color: var(--text); }

        /* CONTENT */
        .dash-body { position: relative; z-index: 1; max-width: 1360px; margin: 0 auto; padding: 24px 24px 48px; }

        /* TABS */
        .tab-bar { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 24px; }
        .tab-btn { padding: 7px 18px; border-radius: 9px; border: none; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; color: var(--text-dim); background: transparent; }
        .tab-btn.active { background: var(--surface-2); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
        .tab-btn.active-ice { background: var(--ice-dim); color: var(--ice); border: 1px solid var(--border-bright); }

        /* SHIFT STATUS */
        .shift-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-radius: var(--radius); border: 1px solid; margin-bottom: 20px; }
        .shift-bar-open { background: var(--green-dim); border-color: rgba(52,211,153,0.25); }
        .shift-bar-closed { background: var(--red-dim); border-color: rgba(248,113,113,0.25); }
        .shift-indicator { display: flex; align-items: center; gap: 8px; }
        .sdot { width: 7px; height: 7px; border-radius: 50%; }
        .sdot-open { background: var(--green); animation: pulse 2s infinite; }
        .sdot-closed { background: var(--red); }
        @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(52,211,153,0.4)} 50%{opacity:0.8;box-shadow:0 0 0 4px rgba(52,211,153,0)} }
        .slabel { font-size: 13px; font-weight: 700; }
        .slabel-open { color: var(--green); }
        .slabel-closed { color: var(--red); }
        .expected-chip { font-family: 'DM Mono', monospace; font-size: 11px; padding: 3px 10px; border-radius: 20px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); color: var(--green); }

        /* LOW STOCK ALERT */
        .alert-box { background: rgba(251,191,36,0.07); border: 1px solid rgba(251,191,36,0.22); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 20px; }
        .alert-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .alert-title { font-size: 12px; font-weight: 700; color: var(--amber); }
        .alert-cnt { font-size: 9px; font-weight: 700; background: var(--amber-dim); border: 1px solid rgba(251,191,36,0.3); color: var(--amber); padding: 2px 6px; border-radius: 10px; font-family: 'DM Mono', monospace; }
        .alert-items { display: flex; flex-wrap: wrap; gap: 5px; }
        .alert-item { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.15); border-radius: 7px; padding: 3px 8px; font-size: 11px; color: var(--text); display: flex; align-items: center; gap: 5px; }
        .alert-item-stock { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--amber); }

        /* KPI */
        .kpi-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; margin-bottom: 24px; }
        @media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
        .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; position: relative; overflow: hidden; transition: border-color 0.2s,transform 0.2s; cursor: default; }
        .kpi-card:hover { border-color: var(--border-bright); transform: translateY(-1px); }
        .kpi-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; opacity:0; transition:opacity 0.2s; }
        .kpi-card:hover::after { opacity: 1; }
        .kpi-ice::after{background:linear-gradient(90deg,var(--ice),transparent)}
        .kpi-green::after{background:linear-gradient(90deg,var(--green),transparent)}
        .kpi-amber::after{background:linear-gradient(90deg,var(--amber),transparent)}
        .kpi-purple::after{background:linear-gradient(90deg,var(--purple),transparent)}
        .kpi-label { font-size: 10px; color: var(--text-dim); font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; }
        .kpi-value { font-family: 'DM Mono', monospace; font-size: 24px; font-weight: 500; color: #fff; margin-top: 5px; letter-spacing: -0.5px; }
        .kpi-icon { position: absolute; top: 12px; right: 12px; font-size: 17px; opacity: 0.35; }
        .kpi-delta { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

        /* SECTION */
        .section-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-dim); display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .section-label::after { content:''; flex:1; height:1px; background:var(--border); }

        /* GLASS CARD */
        .glass-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
        .card-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
        .card-title span { font-size: 14px; }

        /* CHART LEGEND */
        .chart-legend { display: flex; gap: 14px; margin-top: 8px; }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--text-muted); }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; }

        /* CHART META */
        .chart-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .chart-meta-val { font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500; color: #fff; }
        .chart-meta-sub { font-size: 11px; color: var(--text-dim); }
        .peak-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); font-size: 10px; font-weight: 600; color: var(--green); font-family: 'DM Mono', monospace; }

        /* SHIFT PERF TABLE */
        .shift-table { display: flex; flex-direction: column; gap: 4px; }
        .shift-table-header { display: grid; grid-template-columns: 80px 1fr 70px 60px 60px 60px; gap: 8px; padding: 4px 12px; font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-muted); }

        /* RECON */
        .recon-row-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); }
        .recon-row-item:last-of-type { border-bottom: none; }
        .rlabel { font-size: 11px; color: var(--text-dim); }
        .rval { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); }
        .diff-chip { display: inline-flex; align-items: center; justify-content: center; gap: 5px; margin-top: 10px; padding: 7px 14px; border-radius: 9px; border: 1px solid; font-size: 12px; font-weight: 700; width: 100%; }

        /* PAY ROW */
        .pay-row-item { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); }
        .pay-row-item:last-child { border-bottom: none; }
        .pay-label { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-dim); }
        .pay-dot { width: 8px; height: 8px; border-radius: 50%; }
        .pay-val { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: var(--text); }

        /* BILL PREVIEW */
        .bill-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; color: var(--text-dim); }
        .bill-val { font-family: 'DM Mono', monospace; color: var(--text); }

        /* GRIDS */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media(max-width:900px){.grid-2,.grid-3{grid-template-columns:1fr}}

        /* SHIFT CTRL */
        .shift-ctrl { display: flex; flex-direction: column; gap: 10px; }
        .cash-input { width:100%; padding:10px 12px; border-radius:var(--radius-sm); border:1px solid var(--border); background:rgba(0,0,0,0.3); color:var(--text); font-family:'DM Mono',monospace; font-size:14px; outline:none; transition:border-color 0.15s,box-shadow 0.15s; }
        .cash-input::placeholder{color:var(--text-muted);font-size:12px}
        .cash-input:focus{border-color:var(--border-bright);box-shadow:0 0 0 3px var(--ice-dim)}
        .action-btn { width:100%; padding:12px; border-radius:var(--radius-sm); border:none; font-family:'Outfit',sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:7px; }
        .action-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08)}
        .action-btn:disabled{opacity:0.4;cursor:not-allowed}
        .btn-green{background:linear-gradient(135deg,#059669,#34d399);color:#fff;box-shadow:0 4px 14px rgba(52,211,153,0.22)}
        .btn-red{background:linear-gradient(135deg,#dc2626,#f87171);color:#fff;box-shadow:0 4px 14px rgba(248,113,113,0.22)}

        /* MODAL */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fi 0.15s ease}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        .modal-box{background:#090e1a;border:1px solid var(--border-bright);border-radius:20px;padding:28px;width:320px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 40px var(--ice-dim);animation:su 0.2s cubic-bezier(0.4,0,0.2,1)}
        @keyframes su{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .modal-icon{font-size:36px;margin-bottom:10px}
        .modal-title{font-size:17px;font-weight:700;color:#fff;margin-bottom:5px}
        .modal-sub{font-size:12px;color:var(--text-dim);margin-bottom:18px}
        .modal-actions{display:flex;gap:8px;margin-top:16px}
        .modal-actions>*{flex:1}
        .m-btn{padding:11px;border-radius:10px;border:none;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.18s}
        .m-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
        .m-btn-green{background:linear-gradient(135deg,#059669,#34d399);color:#fff}
        .m-btn-red{background:linear-gradient(135deg,#dc2626,#f87171);color:#fff}
        .m-btn-grey{background:var(--surface-2);color:var(--text-dim);border:1px solid var(--border)}

        /* LOADING */
        .loading-screen{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--bg);font-family:'Outfit',sans-serif;color:var(--text-dim)}
        .spinner{width:34px;height:34px;border:2px solid var(--border);border-top-color:var(--ice);border-radius:50%;animation:spin 0.8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {loading && !data ? (
        <div className="loading-screen">
          <div className="spinner" />
          <span>Loading dashboard…</span>
        </div>
      ) : (
        <div className="dash-root">
          {/* TOPBAR */}
          <div className="topbar">
            <div className="topbar-brand">
              <div className="brand-icon">🧊</div>
              <div>
                <div className="brand-name">ICEPOS</div>
                <div className="brand-sub">Dashboard</div>
              </div>
            </div>
            <div className="topbar-right">
              <div className="time-chip">
                {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                &nbsp;·&nbsp;
                {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </div>
              <button className="icon-btn" onClick={init}>↻ Refresh</button>
              <a href="/billing" className="nav-btn nav-btn-primary">⚡ Billing</a>
              <a href="/shift-history" className="nav-btn">📁 History</a>
            </div>
          </div>

          <div className="dash-body">

            {/* SHIFT BAR */}
            <div className={`shift-bar ${isOpen ? "shift-bar-open" : "shift-bar-closed"}`}>
              <div className="shift-indicator">
                <div className={`sdot ${isOpen ? "sdot-open" : "sdot-closed"}`} />
                <span className={`slabel ${isOpen ? "slabel-open" : "slabel-closed"}`}>
                  {isOpen ? "Shift Open" : "Shift Closed"}
                </span>
                {isOpen && shiftStatus?.expected_cash !== undefined && (
                  <span className="expected-chip" style={{ marginLeft: 8 }}>
                    Expected ₹{shiftStatus.expected_cash}
                  </span>
                )}
              </div>
              {hourly?.peak && hourly.peak.total > 0 && (
                <span className="peak-badge">
                  🔥 Peak: {hourly.peak.label} · ₹{hourly.peak.total.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {/* LOW STOCK */}
            {lowStock.length > 0 && (
              <div className="alert-box">
                <div className="alert-header">
                  <span style={{ fontSize: 13 }}>⚠</span>
                  <span className="alert-title">Low Stock</span>
                  <span className="alert-cnt">{lowStock.length} items</span>
                </div>
                <div className="alert-items">
                  {lowStock.map((x) => (
                    <div key={x.product.id} className="alert-item">
                      {x.product.name}
                      <span className="alert-item-stock">{x.current_stock}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABS */}
            <div className="tab-bar">
              {(["overview", "analytics", "shifts"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? "active active-ice" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "overview" ? "📊 Overview" : tab === "analytics" ? "📈 Analytics" : "🔄 Shifts"}
                </button>
              ))}
            </div>

            {/* ══════════ OVERVIEW TAB ══════════ */}
            {activeTab === "overview" && (
              <>
                <div className="section-label">Today's Performance</div>
                <div className="kpi-grid">
                  <div className="kpi-card kpi-ice">
                    <div className="kpi-icon">💰</div>
                    <div className="kpi-label">Total Sales</div>
                    <div className="kpi-value">₹{(data?.totalSales ?? 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="kpi-card kpi-green">
                    <div className="kpi-icon">💵</div>
                    <div className="kpi-label">Cash</div>
                    <div className="kpi-value">₹{(data?.cash ?? 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="kpi-card kpi-ice">
                    <div className="kpi-icon">📲</div>
                    <div className="kpi-label">UPI</div>
                    <div className="kpi-value">₹{(data?.upi ?? 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="kpi-card kpi-purple">
                    <div className="kpi-icon">💳</div>
                    <div className="kpi-label">Card</div>
                    <div className="kpi-value">₹{(data?.card ?? 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-icon">🧾</div>
                    <div className="kpi-label">Bills</div>
                    <div className="kpi-value">{data?.billCount ?? 0}</div>
                    {data?.billCount && data.totalSales ? (
                      <div className="kpi-delta">₹{Math.round((data.totalSales ?? 0) / (data.billCount ?? 1))} avg/bill</div>
                    ) : null}
                  </div>
                </div>

                <div className="grid-3" style={{ marginBottom: 16 }}>
                  {/* Payment breakdown */}
                  {staffToday && (
                    <div className="glass-card">
                      <div className="card-title"><span>💳</span> Payment Split</div>
                      <div className="pay-row-item">
                        <div className="pay-label"><div className="pay-dot" style={{ background: "#34d399" }} />Cash</div>
                        <div className="pay-val">₹{staffToday.cash ?? 0}</div>
                      </div>
                      <div className="pay-row-item">
                        <div className="pay-label"><div className="pay-dot" style={{ background: "#00d4ff" }} />UPI</div>
                        <div className="pay-val">₹{staffToday.upi ?? 0}</div>
                      </div>
                      <div className="pay-row-item">
                        <div className="pay-label"><div className="pay-dot" style={{ background: "#a78bfa" }} />Card</div>
                        <div className="pay-val">₹{staffToday.card ?? 0}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total · {staffToday.count ?? 0} bills</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: "#fff" }}>₹{staffToday.total ?? 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Last Bill */}
                  <div className="glass-card" style={{ display: "flex", flexDirection: "column" }}>
                    <div className="card-title">
                      <span>🧾</span> Last Bill
                      {lastBill && <span style={{ marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>#{lastBill.invoice_number || "—"}</span>}
                    </div>
                    {lastBill ? (
                      <>
                        {(lastBill.items || []).slice(0, 4).map((item, i) => (
                          <div key={i} className="bill-row">
                            <span>{item.name} ×{item.quantity}</span>
                            <span className="bill-val">₹{item.total}</span>
                          </div>
                        ))}
                        {(lastBill.items || []).length > 4 && <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "2px 0" }}>+{(lastBill.items || []).length - 4} more</div>}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>Total</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: "#fff" }}>₹{lastBill.total_amount}</span>
                        </div>
                        <button onClick={reprintLastBill} style={{ marginTop: 10, padding: "7px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-dim)", fontFamily: "'Outfit',sans-serif", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                          onMouseOver={(e) => { (e.target as HTMLElement).style.color = "var(--text)"; }}
                          onMouseOut={(e) => { (e.target as HTMLElement).style.color = "var(--text-dim)"; }}>
                          🖨 Reprint
                        </button>
                      </>
                    ) : <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", paddingTop: 16 }}>No bills yet</div>}
                  </div>

                  {/* Shift Control */}
                  <ShiftControl shiftStatus={shiftStatus} reload={init} />
                </div>

                {/* Live + Last Closed */}
                <div className="grid-2">
                  {liveShift ? (
                    <div className="glass-card">
                      <div className="card-title">
                        <span>🟢</span> Live Shift
                        <span style={{ marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 10, background: "var(--green-dim)", border: "1px solid rgba(52,211,153,0.2)", fontSize: 9, fontWeight: 700, color: "var(--green)" }}>
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 1.5s infinite" }} />LIVE
                        </span>
                      </div>
                      {[["Opening Cash", `₹${liveShift.opening_cash}`], ["Cash Sales", `₹${liveShift.cash_sales}`], ["UPI Sales", `₹${liveShift.upi_sales}`], ["Total Sales", `₹${liveShift.total_sales}`]].map(([l, v]) => (
                        <div key={l} className="recon-row-item"><span className="rlabel">{l}</span><span className="rval">{v}</span></div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>Expected in Drawer</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 600, color: "var(--green)" }}>₹{liveShift.expected_cash}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>No active shift</div>
                  )}

                  {lastClosed ? (
                    <div className="glass-card">
                      <div className="card-title"><span>🔒</span> Last Closed Shift</div>
                      {[["Opening Cash", `₹${lastClosed.opening_cash}`], ["Total Sales", `₹${lastClosed.total_sales}`], ["Expected Cash", `₹${lastClosed.expected_cash}`], ["Counted Cash", `₹${lastClosed.closing_cash}`]].map(([l, v]) => (
                        <div key={l} className="recon-row-item"><span className="rlabel">{l}</span><span className="rval">{v}</span></div>
                      ))}
                      {(() => {
                        const d = Number(lastClosed.difference ?? 0);
                        return <div className="diff-chip" style={{ background: diffBg(d), borderColor: diffBorder(d), color: diffColor(d) }}>{d === 0 ? "✅ Perfect Match" : d > 0 ? `🟡 Excess ₹${d}` : `🔴 Shortage ₹${Math.abs(d)}`}</div>;
                      })()}
                    </div>
                  ) : (
                    <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>No previous shift</div>
                  )}
                </div>
              </>
            )}

            {/* ══════════ ANALYTICS TAB ══════════ */}
            {activeTab === "analytics" && (
              <>
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  {/* Hourly Sales Chart */}
                  <div className="glass-card">
                    <div className="chart-meta">
                      <div>
                        <div className="card-title" style={{ marginBottom: 2 }}><span>📈</span> Hourly Sales — Today</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 500, color: "#fff" }}>
                          ₹{(hourly?.total_today ?? 0).toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>{hourly?.total_bills ?? 0} bills total</div>
                      </div>
                      {hourly?.peak && hourly.peak.total > 0 && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Peak Hour</div>
                          <span className="peak-badge">🔥 {hourly.peak.label}</span>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "var(--green)", marginTop: 3 }}>₹{hourly.peak.total.toLocaleString("en-IN")}</div>
                        </div>
                      )}
                    </div>
                    <HourlyChart slots={hourly?.slots ?? []} />
                    <div className="chart-legend">
                      <div className="legend-item"><div className="legend-dot" style={{ background: "#00d4ff" }} />Regular hours</div>
                      <div className="legend-item"><div className="legend-dot" style={{ background: "#34d399" }} />Peak hour</div>
                    </div>
                  </div>

                  {/* Top 5 Products */}
                  <div className="glass-card">
                    <div className="card-title"><span>🏆</span> Top Products — Today</div>
                    <TopProducts items={data?.topItems ?? []} />

                    {data?.topItems && data.topItems.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>All Items Today</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {(data.topItems || []).slice(5).map((item) => (
                            <span key={item.name} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                              {item.name} <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--text-muted)" }}>×{item.qty}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hourly breakdown table */}
                {hourly?.slots && hourly.slots.some((s) => s.total > 0) && (
                  <div className="glass-card">
                    <div className="card-title"><span>⏱</span> Hour-by-Hour Breakdown</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6 }}>
                      {hourly.slots.filter((s) => s.total > 0).map((s) => (
                        <div key={s.hour} style={{
                          padding: "8px 10px", borderRadius: 8,
                          background: s.hour === hourly.peak?.hour ? "rgba(52,211,153,0.08)" : "var(--surface)",
                          border: `1px solid ${s.hour === hourly.peak?.hour ? "rgba(52,211,153,0.2)" : "var(--border)"}`,
                        }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: s.hour === hourly.peak?.hour ? "var(--green)" : "var(--text-muted)", fontWeight: 700 }}>{s.label}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#fff", fontWeight: 500, marginTop: 2 }}>₹{s.total.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{s.count} bills</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ══════════ SHIFTS TAB ══════════ */}
            {activeTab === "shifts" && (
              <>
                {/* Summary KPIs */}
                {shiftPerf?.summary && (
                  <>
                    <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
                      <div className="kpi-card kpi-ice">
                        <div className="kpi-icon">🔄</div>
                        <div className="kpi-label">Shifts Analyzed</div>
                        <div className="kpi-value">{shiftPerf.summary.shift_count}</div>
                      </div>
                      <div className="kpi-card kpi-green">
                        <div className="kpi-icon">💰</div>
                        <div className="kpi-label">Total Revenue</div>
                        <div className="kpi-value">₹{shiftPerf.summary.total_revenue.toLocaleString("en-IN")}</div>
                      </div>
                      <div className="kpi-card kpi-amber">
                        <div className="kpi-icon">📊</div>
                        <div className="kpi-label">Avg per Shift</div>
                        <div className="kpi-value">₹{shiftPerf.summary.avg_per_shift.toLocaleString("en-IN")}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-icon">🧾</div>
                        <div className="kpi-label">Total Bills</div>
                        <div className="kpi-value">{shiftPerf.summary.total_bills}</div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="glass-card" style={{ marginBottom: 16 }}>
                      <div className="card-title"><span>📊</span> Shift Revenue Trend (last {shiftPerf.summary.shift_count} shifts)</div>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--amber)" }}>— avg bill / shift (trend line)</span>
                      </div>
                      <ShiftPerfChart shifts={shiftPerf.shifts} />
                      <div className="chart-legend" style={{ marginTop: 10 }}>
                        <div className="legend-item"><div className="legend-dot" style={{ background: "#00d4ff" }} />Regular shift</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: "#34d399" }} />Best shift</div>
                        <div className="legend-item"><span style={{ display: "inline-block", width: 12, height: 1, background: "#fbbf24", verticalAlign: "middle", marginRight: 4 }} />Avg bill trend</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Shift Table */}
                {shiftPerf?.shifts && shiftPerf.shifts.length > 0 ? (
                  <div className="glass-card">
                    <div className="card-title"><span>📋</span> Shift Details</div>
                    <div className="shift-table-header">
                      <div>Date</div>
                      <div>Revenue</div>
                      <div style={{ textAlign: "right" }}>Bills</div>
                      <div style={{ textAlign: "right" }}>Avg</div>
                      <div style={{ textAlign: "right" }}>Cash/UPI</div>
                      <div style={{ textAlign: "right" }}>Diff</div>
                    </div>
                    <div className="shift-table">
                      {[...shiftPerf.shifts].reverse().map((s) => (
                        <ShiftRow key={s.id} s={s} isBest={s.total_sales === shiftPerf.summary?.best_shift?.total_sales} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="glass-card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
                    <div>No closed shift data yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Close a shift to see performance analytics</div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}

/* ─── Shift Control ──────────────────────────────────────────────────────── */

function ShiftControl({ shiftStatus, reload }: { shiftStatus: ShiftStatus | null; reload: () => Promise<void> }) {
  const [showModal, setShowModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");

  const isOpen = shiftStatus?.open; // ✅ MUST BE ABOVE useEffect

  const [recon, setRecon] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // ✅ auto-fill counted cash
  useEffect(() => {
    if (isOpen && shiftStatus?.expected_cash != null && closingCash === "") {
      setClosingCash(String(shiftStatus.expected_cash));
    }
  }, [isOpen, shiftStatus?.expected_cash]);

  async function openShift() {
    if (!openingCash || Number(openingCash) < 0) return;
    setSubmitting(true);
    const res = await fetch("/api/reports/shift-open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opening_cash: Number(openingCash) }) });
    const d = await res.json();
    if (!res.ok) { alert(d.error || "Failed"); setSubmitting(false); return; }
    setShowModal(false); setOpeningCash(""); setRecon(null);
    await reload(); setSubmitting(false);
  }

  async function closeShift() {
    if (!closingCash || Number(closingCash) < 0) return;
    setSubmitting(true);
    const res = await fetch("/api/reports/shift-close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ closing_cash: Number(closingCash) }) });
    const d = await res.json();
    if (!res.ok) { alert(d.error || "Failed"); setSubmitting(false); return; }
    setRecon(d.summary); setClosingCash("");
    await reload(); setSubmitting(false);
  }

  const diff = Number(recon?.difference ?? 0);
  const dc = diff === 0 ? "#34d399" : diff > 0 ? "#fbbf24" : "#f87171";
  const db = diff === 0 ? "rgba(52,211,153,0.1)" : diff > 0 ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)";
  const dbrd = diff === 0 ? "rgba(52,211,153,0.3)" : diff > 0 ? "rgba(251,191,36,0.3)" : "rgba(248,113,113,0.3)";

  return (
    <>
      <div className="glass-card shift-ctrl">
        <div className="card-title" style={{ marginBottom: 0 }}><span>⚙️</span> Shift Control</div>
        {recon ? (
          <>
            {[["Opening Cash", `₹${recon.opening_cash}`], ["Cash Sales", `₹${recon.cash_sales}`], ["Expected", `₹${recon.expected_cash}`], ["Counted", `₹${recon.closing_cash}`]].map(([l, v]) => (
              <div key={l} className="recon-row-item"><span className="rlabel">{l}</span><span className="rval">{v}</span></div>
            ))}
            <div className="diff-chip" style={{ background: db, borderColor: dbrd, color: dc }}>
              {diff === 0 ? "✅ Perfect Match" : diff > 0 ? `🟡 Excess ₹${diff}` : `🔴 Shortage ₹${Math.abs(diff)}`}
            </div>
          </>
        ) : isOpen ? (
          <>
            <input type="number" className="cash-input" placeholder="Counted cash…" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
            {shiftStatus?.expected_cash !== undefined && (
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Expected: <span style={{ color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>₹{shiftStatus.expected_cash}</span></div>
            )}
            <button className="action-btn btn-red" onClick={closeShift} disabled={submitting || !closingCash}>
              {submitting ? "Closing…" : "🔒 Close Shift"}
            </button>
          </>
        ) : (
          <button className="action-btn btn-green" onClick={() => setShowModal(true)}>🟢 Open Shift</button>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🧊</div>
            <div className="modal-title">Open New Shift</div>
            <div className="modal-sub">Enter opening cash in the drawer</div>
            <input type="number" className="cash-input" placeholder="₹ 0.00" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} onKeyDown={(e) => e.key === "Enter" && openShift()} autoFocus />
            <div className="modal-actions">
              <button className="m-btn m-btn-grey" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="m-btn m-btn-green" onClick={openShift} disabled={submitting || !openingCash}>{submitting ? "…" : "Start Shift"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
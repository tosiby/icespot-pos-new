"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */
type User = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  lastLoginAt?: string;
};

type Stats = {
  today: { totalSales: number; cash: number; upi: number; card: number; billCount: number };
  activeShifts: number;
  stock: { total: number; lowStock: number; outOfStock: number; lowStockItems: { name: string; qty: number }[] };
  users: { total: number; active: number; byRole: { STAFF: number; MANAGER: number; ADMIN: number } };
  topItems: { name: string; qty: number }[];
};

type Tab = "dashboard" | "users";

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function SuperAdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "STAFF" });
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/superadmin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/superadmin/users");
    if (res.ok) setUsers(await res.json());
    else showToast("Access denied — SUPERADMIN only", "error");
  }, [showToast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadUsers()]);
      setLoading(false);
    })();
  }, [loadStats, loadUsers]);

  /* ── Create User ─────────────────────────────────────────────── */
  async function handleCreate() {
    if (!newUser.email || !newUser.password) { showToast("Fill all fields", "error"); return; }
    if (newUser.password.length < 6) { showToast("Password min 6 chars", "error"); return; }
    setCreating(true);
    const res = await fetch("/api/superadmin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { showToast(data.error || "Failed", "error"); return; }
    showToast(`✓ User ${newUser.email} created`, "success");
    setShowCreate(false);
    setNewUser({ email: "", password: "", role: "STAFF" });
    await loadUsers();
  }

  /* ── Reset Password ──────────────────────────────────────────── */
  async function handleReset() {
    if (!showReset || !newPwd) return;
    if (newPwd.length < 6) { showToast("Password min 6 chars", "error"); return; }
    setResetting(true);
    const res = await fetch("/api/superadmin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: showReset.id, newPassword: newPwd }),
    });
    const data = await res.json();
    setResetting(false);
    if (!res.ok) { showToast(data.error || "Failed", "error"); return; }
    showToast(`✓ Password reset for ${showReset.email}`, "success");
    setShowReset(null);
    setNewPwd("");
  }

  /* ── Toggle Active ───────────────────────────────────────────── */
  async function toggleActive(u: User) {
    const res = await fetch("/api/superadmin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
    });
    if (res.ok) {
      showToast(`${u.email} ${!u.isActive ? "activated" : "deactivated"}`, "info");
      await loadUsers();
    }
  }

  /* ── Change Role ─────────────────────────────────────────────── */
  async function changeRole(u: User, role: string) {
    const res = await fetch("/api/superadmin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, role }),
    });
    if (res.ok) {
      showToast(`${u.email} → ${role}`, "success");
      await loadUsers();
    }
  }

  if (loading) return (
    <div style={S.loadWrap}>
      <div style={S.loadDot} />
      <span style={{ color: "#64748b", fontSize: 14 }}>Loading Super Admin…</span>
    </div>
  );

  return (
    <div style={S.root}>
      {/* ── SIDEBAR ────────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🧊</div>
          <div>
            <div style={S.logoName}>ICEPOS</div>
            <div style={S.logoRole}>Super Admin</div>
          </div>
        </div>

        <nav style={S.nav}>
          {([
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "users",     icon: "👥", label: "Users & Roles" },
          ] as { id: Tab; icon: string; label: string }[]).map(item => (
            <button
              key={item.id}
              style={{ ...S.navBtn, ...(tab === item.id ? S.navBtnActive : {}) }}
              onClick={() => setTab(item.id)}
            >
              <span style={S.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={S.sideFooter}>
          <a href="/dashboard" style={S.backLink}>← Back to Dashboard</a>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────── */}
      <main style={S.main}>

        {/* ━━━━━━━━━━━━━━━━━ DASHBOARD TAB ━━━━━━━━━━━━━━━━━━━━ */}
        {tab === "dashboard" && stats && (
          <div style={S.content}>
            <h1 style={S.pageTitle}>📊 Executive Overview</h1>
            <p style={S.pageSub}>Today's business health at a glance</p>

            {/* KPI row */}
            <div style={S.kpiGrid}>
              <KpiCard icon="💰" label="Today Sales" value={`₹${stats.today.totalSales.toFixed(2)}`} color="#00d4ff" />
              <KpiCard icon="🧾" label="Bills Today" value={String(stats.today.billCount)} color="#34d399" />
              <KpiCard icon="🔄" label="Active Shifts" value={String(stats.activeShifts)} color="#a78bfa" />
              <KpiCard icon="👥" label="Total Users" value={String(stats.users.active)} color="#fbbf24" />
              <KpiCard icon="⚠️" label="Low Stock" value={String(stats.stock.lowStock)} color="#f97316" />
              <KpiCard icon="✕" label="Out of Stock" value={String(stats.stock.outOfStock)} color="#f87171" />
            </div>

            {/* Payment split + top items */}
            <div style={S.row2}>
              <div style={S.card}>
                <h3 style={S.cardTitle}>💳 Payment Split</h3>
                <PayBar label="Cash" value={stats.today.cash} total={stats.today.totalSales} color="#34d399" />
                <PayBar label="UPI"  value={stats.today.upi}  total={stats.today.totalSales} color="#00d4ff" />
                <PayBar label="Card" value={stats.today.card} total={stats.today.totalSales} color="#a78bfa" />
              </div>

              <div style={S.card}>
                <h3 style={S.cardTitle}>🏆 Top Selling Items</h3>
                {stats.topItems.length === 0
                  ? <div style={S.empty}>No sales yet today</div>
                  : stats.topItems.map((it, i) => (
                    <div key={it.name} style={S.topRow}>
                      <span style={S.topRank}>#{i + 1}</span>
                      <span style={S.topName}>{it.name}</span>
                      <span style={S.topQty}>{it.qty} sold</span>
                    </div>
                  ))}
              </div>

              <div style={S.card}>
                <h3 style={S.cardTitle}>📦 Stock Alerts</h3>
                <div style={S.statRow}><span style={S.statLabel}>Total Products</span><b>{stats.stock.total}</b></div>
                <div style={S.statRow}><span style={S.statLabel}>Low Stock</span><b style={{ color: "#f97316" }}>{stats.stock.lowStock}</b></div>
                <div style={S.statRow}><span style={S.statLabel}>Out of Stock</span><b style={{ color: "#f87171" }}>{stats.stock.outOfStock}</b></div>
                {stats.stock.lowStockItems.length > 0 && (
                  <>
                    <div style={{ ...S.statLabel, marginTop: 12, marginBottom: 6 }}>Critical items:</div>
                    {stats.stock.lowStockItems.map(p => (
                      <div key={p.name} style={S.alertRow}>
                        <span>⚠ {p.name}</span>
                        <span style={{ color: "#f97316" }}>{p.qty} left</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div style={S.card}>
                <h3 style={S.cardTitle}>👤 User Summary</h3>
                <div style={S.statRow}><span style={S.statLabel}>Staff</span><b>{stats.users.byRole.STAFF}</b></div>
                <div style={S.statRow}><span style={S.statLabel}>Manager</span><b>{stats.users.byRole.MANAGER}</b></div>
                <div style={S.statRow}><span style={S.statLabel}>Admin</span><b>{stats.users.byRole.ADMIN}</b></div>
                <div style={{ ...S.statRow, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                  <span style={S.statLabel}>Active Users</span>
                  <b style={{ color: "#34d399" }}>{stats.users.active}</b>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━ USERS TAB ━━━━━━━━━━━━━━━━━━━━━━━ */}
        {tab === "users" && (
          <div style={S.content}>
            <div style={S.pageHeader}>
              <div>
                <h1 style={S.pageTitle}>👥 Users & Role Management</h1>
                <p style={S.pageSub}>{users.length} users · Logged in as SUPER ADMIN</p>
              </div>
              <button style={S.createBtn} onClick={() => setShowCreate(true)}>+ Create User</button>
            </div>

            {/* Accounts: admin@icepos.com, manager@icespot.com, staff@icespot.com */}
            <div style={S.infoBox}>
              <b>📋 Known accounts:</b>&nbsp;
              admin@icepos.com (SUPERADMIN) · manager@icespot.com (MANAGER) · staff@icespot.com (STAFF)
            </div>

            <div style={S.table}>
              {/* header */}
              <div style={S.tableHead}>
                <div style={{ flex: 2 }}>Email</div>
                <div style={{ flex: 1 }}>Role</div>
                <div style={{ flex: 1 }}>Status</div>
                <div style={{ flex: 1 }}>Created</div>
                <div style={{ flex: 2, textAlign: "right" as const }}>Actions</div>
              </div>

              {users.length === 0 && <div style={S.empty}>No users found</div>}

              {users.map(u => (
                <div key={u.id} style={{ ...S.tableRow, opacity: u.isActive === false ? 0.5 : 1 }}>
                  <div style={{ flex: 2, fontWeight: 500, fontSize: 13 }}>
                    {u.email}
                    {u.role === "SUPERADMIN" && <span style={S.badge}>👑 SUPER</span>}
                  </div>

                  <div style={{ flex: 1 }}>
                    {u.role === "SUPERADMIN"
                      ? <span style={{ ...S.rolePill, background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>{u.role}</span>
                      : (
                        <select
                          style={S.roleSelect}
                          value={u.role}
                          onChange={e => changeRole(u, e.target.value)}
                        >
                          <option value="STAFF">STAFF</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )
                    }
                  </div>

                  <div style={{ flex: 1 }}>
                    <span style={{
                      ...S.rolePill,
                      background: u.isActive !== false ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                      color: u.isActive !== false ? "#34d399" : "#f87171",
                      border: `1px solid ${u.isActive !== false ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                    }}>
                      {u.isActive !== false ? "● Active" : "○ Disabled"}
                    </span>
                  </div>

                  <div style={{ flex: 1, fontSize: 11, color: "#64748b" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}
                  </div>

                  <div style={{ flex: 2, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {u.role !== "SUPERADMIN" && (
                      <>
                        <ActionBtn
                          label="🔑 Reset Pwd"
                          color="#00d4ff"
                          onClick={() => { setShowReset(u); setNewPwd(""); }}
                        />
                        <ActionBtn
                          label={u.isActive !== false ? "🚫 Disable" : "✓ Enable"}
                          color={u.isActive !== false ? "#f87171" : "#34d399"}
                          onClick={() => toggleActive(u)}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── CREATE USER MODAL ─────────────────────────────────── */}
      {showCreate && (
        <div style={S.overlay} onClick={() => setShowCreate(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalIcon}>👤</div>
            <div style={S.modalTitle}>Create New User</div>
            <div style={S.modalSub}>Add staff, manager or admin to the system</div>

            <label style={S.label}>Email</label>
            <input
              style={S.input}
              type="email"
              placeholder="user@icespot.com"
              value={newUser.email}
              onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
            />

            <label style={S.label}>Password</label>
            <input
              style={S.input}
              type="password"
              placeholder="Min 6 characters"
              value={newUser.password}
              onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
            />

            <label style={S.label}>Role</label>
            <select
              style={S.input}
              value={newUser.role}
              onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
            >
              <option value="STAFF">STAFF</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <div style={S.modalActions}>
              <button style={S.btnGrey} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={S.btnGreen} onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ──────────────────────────────── */}
      {showReset && (
        <div style={S.overlay} onClick={() => setShowReset(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalIcon}>🔑</div>
            <div style={S.modalTitle}>Reset Password</div>
            <div style={S.modalSub}>
              Setting new password for<br />
              <b style={{ color: "#00d4ff" }}>{showReset.email}</b>
              &nbsp;({showReset.role})
            </div>

            <label style={S.label}>New Password</label>
            <input
              style={S.input}
              type="password"
              placeholder="Min 6 characters"
              value={newPwd}
              autoFocus
              onChange={e => setNewPwd(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleReset()}
            />

            {newPwd.length > 0 && newPwd.length < 6 && (
              <div style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>⚠ Too short (min 6 chars)</div>
            )}

            <div style={S.modalActions}>
              <button style={S.btnGrey} onClick={() => setShowReset(null)}>Cancel</button>
              <button
                style={S.btnBlue}
                onClick={handleReset}
                disabled={resetting || newPwd.length < 6}
              >
                {resetting ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{ ...S.toast, ...(toast.type === "success" ? S.toastSuccess : toast.type === "error" ? S.toastError : S.toastInfo) }}>
          {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"} {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════ */
function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function PayBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "#94a3b8" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>₹{value.toFixed(0)} <span style={{ color: "#475569" }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      style={{ ...S.actionBtn, borderColor: `${color}40`, color }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════ */
const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", height: "100vh", background: "#06090f", color: "#e2e8f0", fontFamily: "'Outfit', sans-serif", overflow: "hidden" },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#06090f", gap: 12 },
  loadDot: { width: 32, height: 32, borderRadius: "50%", border: "3px solid #00d4ff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" },

  // sidebar
  sidebar: { width: 220, flexShrink: 0, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 0" },
  logo: { display: "flex", alignItems: "center", gap: 10, padding: "0 18px 24px" },
  logoIcon: { width: 36, height: 36, background: "linear-gradient(135deg,#00d4ff,#0099bb)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  logoName: { fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: "#fff" },
  logoRole: { fontSize: 9, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 10px" },
  navBtn: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: "none", color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%" },
  navBtnActive: { background: "rgba(0,212,255,0.1)", color: "#00d4ff", fontWeight: 600 },
  navIcon: { fontSize: 16, width: 20, textAlign: "center" },
  sideFooter: { padding: "16px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" },
  backLink: { fontSize: 11, color: "#475569", textDecoration: "none" },

  // main
  main: { flex: 1, overflow: "auto", background: "#06090f" },
  content: { padding: "32px 32px" },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 },
  pageSub: { fontSize: 12, color: "#64748b", marginBottom: 28 },

  // kpi
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 },
  kpiCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 16px" },

  // 2-col row
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 },

  // pay bar / top items
  topRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  topRank: { fontSize: 10, color: "#475569", width: 18 },
  topName: { flex: 1, fontSize: 13 },
  topQty: { fontSize: 12, color: "#00d4ff", fontWeight: 600 },
  alertRow: { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#94a3b8" },
  statRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  statLabel: { color: "#64748b", fontSize: 12 },
  empty: { fontSize: 13, color: "#475569", padding: "12px 0" },

  // users table
  infoBox: { background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#94a3b8", marginBottom: 20 },
  table: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" },
  tableHead: { display: "flex", padding: "12px 18px", background: "rgba(255,255,255,0.03)", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tableRow: { display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s" },
  badge: { marginLeft: 6, fontSize: 9, background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 4, padding: "1px 5px", fontWeight: 700 },
  rolePill: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 0.3 },
  roleSelect: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0", fontSize: 11, padding: "4px 8px", cursor: "pointer" },
  actionBtn: { padding: "5px 10px", borderRadius: 7, border: "1px solid", background: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" },
  createBtn: { padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },

  // modals
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  modal: { background: "#090e1a", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 20, padding: 32, width: 360, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" },
  modalIcon: { fontSize: 36, textAlign: "center", marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 20, lineHeight: 1.6 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5, marginTop: 14 },
  input: { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" },
  modalActions: { display: "flex", gap: 8, marginTop: 22 },
  btnGreen: { flex: 1, padding: 11, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#059669,#34d399)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnBlue: { flex: 1, padding: 11, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0099bb,#00d4ff)", color: "#06090f", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnGrey: { flex: 1, padding: 11, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer" },

  // toast
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "11px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 99999, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(20px)", whiteSpace: "nowrap", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" },
  toastSuccess: { background: "rgba(6,55,40,0.95)", border: "1px solid rgba(52,211,153,0.4)", color: "#34d399" },
  toastError: { background: "rgba(60,10,10,0.95)", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171" },
  toastInfo: { background: "rgba(7,18,38,0.95)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" },
};
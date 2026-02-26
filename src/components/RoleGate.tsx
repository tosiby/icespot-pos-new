import { useRole, type Role } from "@/lib/useRole";

/* ─── RoleGate ───────────────────────────────────────────────────────────── 
   
   Usage examples:

   // Only render for ADMIN+
   <RoleGate min="ADMIN">
     <AnalyticsTab />
   </RoleGate>

   // Only SUPERADMIN, show custom fallback
   <RoleGate min="SUPERADMIN" fallback={<div>No access</div>}>
     <UserManagement />
   </RoleGate>

   // Hide entirely (no fallback) for STAFF
   <RoleGate min="ADMIN">
     <button>Delete Bill</button>
   </RoleGate>

─────────────────────────────────────────────────────────────────────────── */

type Props = {
  min: "STAFF" | "ADMIN" | "SUPERADMIN";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** If true, shows a loading skeleton while role is being fetched */
  showLoader?: boolean;
};

export function RoleGate({ min, children, fallback = null, showLoader = false }: Props) {
  const { can, loading } = useRole();

  if (loading) {
    return showLoader ? <RoleSkeleton /> : null;
  }

  return can(min) ? <>{children}</> : <>{fallback}</>;
}

/* ─── Role Badge ─────────────────────────────────────────────────────────── 
   Drop anywhere to show the current user's role pill.
─────────────────────────────────────────────────────────────────────────── */

const ROLE_STYLE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  SUPERADMIN: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", color: "#a78bfa", label: "Super Admin" },
  ADMIN:      { bg: "rgba(0,212,255,0.1)",    border: "rgba(0,212,255,0.28)", color: "#00d4ff", label: "Admin" },
  STAFF:      { bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)", color: "#34d399", label: "Staff" },
};

export function RoleBadge() {
  const { role, name, loading } = useRole();
  if (loading || !role) return null;
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.STAFF;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 10px",
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 20, fontSize: 11, fontFamily: "'Outfit', sans-serif",
    }}>
      <span style={{ color: "rgba(226,232,240,0.7)" }}>{name ?? "User"}</span>
      <span style={{
        color: s.color, fontWeight: 700, fontSize: 9,
        letterSpacing: "0.5px", textTransform: "uppercase",
        borderLeft: `1px solid ${s.border}`, paddingLeft: 6,
      }}>
        {s.label}
      </span>
    </div>
  );
}

/* ─── Access Denied Card ─────────────────────────────────────────────────── */

export function AccessDenied({ message = "You don't have permission to view this." }: { message?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 10, padding: "40px 20px",
      background: "rgba(248,113,113,0.06)",
      border: "1px solid rgba(248,113,113,0.2)",
      borderRadius: 16, textAlign: "center",
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171" }}>Access Restricted</div>
      <div style={{ fontSize: 12, color: "rgba(100,116,139,0.8)", maxWidth: 280 }}>{message}</div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function RoleSkeleton() {
  return (
    <div style={{
      height: 32, borderRadius: 8,
      background: "rgba(255,255,255,0.04)",
      animation: "role-shimmer 1.2s infinite",
    }}>
      <style>{`
        @keyframes role-shimmer {
          0%,100%{opacity:0.4} 50%{opacity:0.7}
        }
      `}</style>
    </div>
  );
}

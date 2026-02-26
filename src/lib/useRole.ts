import { useEffect, useState } from "react";

/* ─── Role hierarchy ─────────────────────────────────────────────────────── */

export type Role = "SUPERADMIN" | "ADMIN" | "STAFF" | null;

const RANK: Record<string, number> = {
  SUPERADMIN: 3,
  ADMIN: 2,
  STAFF: 1,
};

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export type UseRoleReturn = {
  role: Role;
  userId: string | null;
  email: string | null;
  name: string | null;
  loading: boolean;
  // Permission helpers
  isStaff: boolean;       // STAFF only
  isAdmin: boolean;       // ADMIN or higher
  isSuperAdmin: boolean;  // SUPERADMIN only
  can: (minRole: "STAFF" | "ADMIN" | "SUPERADMIN") => boolean;
};

export function useRole(): UseRoleReturn {
  const [role, setRole] = useState<Role>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setRole(d.role as Role);
          setUserId(d.userId);
          setEmail(d.email);
          setName(d.name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const can = (minRole: "STAFF" | "ADMIN" | "SUPERADMIN") => {
    if (!role) return false;
    return (RANK[role] ?? 0) >= (RANK[minRole] ?? 0);
  };

  return {
    role,
    userId,
    email,
    name,
    loading,
    isStaff: role === "STAFF",
    isAdmin: can("ADMIN"),
    isSuperAdmin: role === "SUPERADMIN",
    can,
  };
}
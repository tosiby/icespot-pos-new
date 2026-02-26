"use client";

import { useEffect, useState } from "react";

export default function SuperAdminPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/superadmin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    } else {
      alert("Access denied");
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>🛡️ Super Admin Panel</h1>

      <h2 style={{ marginTop: 20 }}>👥 Users</h2>

      <div style={{ background: "#fff", padding: 16, borderRadius: 10 }}>
        {users.map((u, i) => (
          <div key={i} style={row}>
            <span>
              {u.email} — {u.role}
            </span>
        <div key={i} style={row}>
  <span>
    {u.email} — {u.role}
  </span>
</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid #eee",
};
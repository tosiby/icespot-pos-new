"use client";

import { useState } from "react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function upload() {
    if (!file) {
      alert("Select file");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setLoading(true);

    const res = await fetch("/api/products/import", {
      method: "POST",
      body: form,
    });

    setLoading(false);

    const data = await res.json();

    if (res.ok) {
      alert(
        `Import done\nCreated: ${data.created}\nUpdated: ${data.updated}`
      );
    } else {
      alert(data.error || "Import failed");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>📦 Stock Excel Import</h1>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <br />
      <br />

      <button
        onClick={upload}
        disabled={loading}
        style={{
          padding: "12px 20px",
          background: "#111",
          color: "#fff",
          borderRadius: 8,
        }}
      >
        {loading ? "Uploading..." : "Upload Excel"}
      </button>
    </div>
  );
}
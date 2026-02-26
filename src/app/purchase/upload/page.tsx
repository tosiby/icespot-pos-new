"use client";

import { useState } from "react";

export default function PurchaseUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  async function upload() {
    if (!file) return alert("Select file");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/purchase/upload", {
      method: "POST",
      body: form,
    });

    const json = await res.json();
    setResult(json);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>📦 Purchase Upload (Excel)</h1>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={upload} style={{ marginLeft: 10 }}>
        Upload
      </button>

      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
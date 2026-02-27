"use client";
import { useState, useRef } from "react";

type UploadResult = {
  success: boolean;
  processed: number;
  failed: number;
  errors: { row: any; error: string }[];
};

export default function PurchaseUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleFile(f: File | null) {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      showToast("Only .xlsx or .xls files are supported", "error");
      return;
    }
    setFile(f);
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  }

  async function upload() {
    if (!file) { showToast("Please select a file first", "error"); return; }
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/purchase/upload", { method: "POST", body: form });
      const json = await res.json();
      setResult(json);
      if (json.processed > 0) showToast(`✓ ${json.processed} products updated`, "success");
      else showToast("No products were updated", "error");
    } catch {
      showToast("Upload failed — network error", "error");
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const csv = "SKU,Name,Quantity\nICE001,Vanilla Scoop,50\nICE002,Chocolate Scoop,30\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stock_upload_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #06090f; --surface: rgba(255,255,255,0.035); --surface-2: rgba(255,255,255,0.06);
          --border: rgba(255,255,255,0.07); --border-bright: rgba(0,210,255,0.28);
          --ice: #00d4ff; --ice-dim: rgba(0,212,255,0.12); --ice-glow: rgba(0,212,255,0.3);
          --green: #34d399; --green-dim: rgba(52,211,153,0.12);
          --red: #f87171; --red-dim: rgba(248,113,113,0.12);
          --amber: #fbbf24; --amber-dim: rgba(251,191,36,0.12);
          --text: #e2e8f0; --text-dim: #64748b; --text-muted: #2d3f55;
          --radius: 16px; --radius-sm: 10px;
        }
        html, body { background: var(--bg); min-height: 100vh; }
        .page { font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; padding: 0; }

        /* TOPBAR */
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 28px; height: 56px; background: rgba(6,9,15,0.9); border-bottom: 1px solid var(--border); backdrop-filter: blur(24px); }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-icon { width: 32px; height: 32px; background: linear-gradient(135deg,var(--ice),#0099bb); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 14px var(--ice-glow); }
        .brand-name { font-size: 15px; font-weight: 700; letter-spacing: 1.5px; color: #fff; }
        .brand-sub { font-size: 10px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
        .nav-btn { padding: 5px 13px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s; }
        .nav-btn:hover { background: var(--surface-2); color: var(--text); border-color: var(--border-bright); }

        /* CONTENT */
        .content { max-width: 760px; margin: 40px auto; padding: 0 24px 60px; }
        .page-title { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .page-sub { font-size: 13px; color: var(--text-dim); margin-bottom: 32px; }

        /* INFO CARDS */
        .info-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 28px; }
        .info-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
        .info-card-icon { font-size: 20px; margin-bottom: 8px; }
        .info-card-title { font-size: 11px; font-weight: 700; color: var(--text-dim); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
        .info-card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

        /* TEMPLATE */
        .template-box { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; margin-bottom: 22px; display: flex; align-items: center; justify-content: space-between; }
        .template-left { display: flex; align-items: center; gap: 12px; }
        .template-icon { font-size: 24px; }
        .template-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .template-sub { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
        .template-cols { display: flex; gap: 6px; margin-top: 6px; }
        .col-pill { font-family: 'DM Mono', monospace; font-size: 10px; background: var(--ice-dim); border: 1px solid var(--border-bright); color: var(--ice); padding: 2px 7px; border-radius: 4px; }
        .dl-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border-bright); background: var(--ice-dim); color: var(--ice); font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .dl-btn:hover { background: rgba(0,212,255,0.18); }

        /* DROP ZONE */
        .dropzone { border: 2px dashed var(--border); border-radius: var(--radius); padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; background: var(--surface); }
        .dropzone.drag { border-color: var(--ice); background: var(--ice-dim); }
        .dropzone.has-file { border-color: rgba(52,211,153,0.4); background: var(--green-dim); }
        .drop-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.7; }
        .drop-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .drop-sub { font-size: 12px; color: var(--text-dim); }
        .file-name { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--green); margin-top: 8px; font-weight: 500; }
        .file-size { font-size: 11px; color: var(--text-dim); margin-top: 3px; }

        /* UPLOAD BTN */
        .upload-btn { width: 100%; padding: 15px; border-radius: 13px; border: none; background: linear-gradient(135deg,#059669,#34d399); color: #fff; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 18px rgba(52,211,153,0.25); }
        .upload-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .upload-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* RESULTS */
        .result-box { margin-top: 28px; }
        .result-header { display: flex; gap: 12px; margin-bottom: 20px; }
        .stat-pill { flex: 1; padding: 14px; border-radius: var(--radius); text-align: center; }
        .stat-pill-green { background: var(--green-dim); border: 1px solid rgba(52,211,153,0.3); }
        .stat-pill-red { background: var(--red-dim); border: 1px solid rgba(248,113,113,0.3); }
        .stat-num { font-family: 'DM Mono', monospace; font-size: 32px; font-weight: 700; }
        .stat-num-green { color: var(--green); }
        .stat-num-red { color: var(--red); }
        .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px; color: var(--text-dim); }

        .errors-box { background: var(--surface); border: 1px solid rgba(248,113,113,0.2); border-radius: var(--radius); overflow: hidden; }
        .errors-head { padding: 12px 16px; background: var(--red-dim); font-size: 12px; font-weight: 700; color: var(--red); letter-spacing: 0.5px; border-bottom: 1px solid rgba(248,113,113,0.2); }
        .error-row { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; gap: 12px; align-items: flex-start; }
        .error-row:last-child { border-bottom: none; }
        .error-sku { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text-dim); min-width: 80px; padding-top: 1px; }
        .error-name { font-size: 12px; color: var(--text); flex: 1; }
        .error-msg { font-size: 11px; color: var(--red); margin-top: 2px; }

        /* TOAST */
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 11px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; z-index: 99999; display: flex; align-items: center; gap: 7px; backdrop-filter: blur(20px); white-space: nowrap; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
        .toast-success { background: rgba(6,55,40,0.95); border: 1px solid rgba(52,211,153,0.4); color: var(--green); }
        .toast-error { background: rgba(60,10,10,0.95); border: 1px solid rgba(248,113,113,0.4); color: var(--red); }
        .toast-info { background: rgba(7,18,38,0.95); border: 1px solid var(--border-bright); color: var(--ice); }
      `}</style>

      <div className="page">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-icon">🧊</div>
            <div>
              <div className="brand-name">ICEPOS</div>
              <div className="brand-sub">Stock Upload</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/superadmin" className="nav-btn">🛡️ Super Admin</a>
            <a href="/dashboard" className="nav-btn">📊 Dashboard</a>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content">
          <div className="page-title">📦 Stock Upload via Excel</div>
          <div className="page-sub">Bulk update product quantities by uploading an Excel file</div>

          {/* HOW IT WORKS */}
          <div className="info-row">
            <div className="info-card">
              <div className="info-card-icon">🔎</div>
              <div className="info-card-title">Smart Resolver</div>
              <div className="info-card-desc">Matches products by SKU first, then falls back to product Name</div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">🔼</div>
              <div className="info-card-title">Adds to Stock</div>
              <div className="info-card-desc">Quantities are added to existing stock, not replaced</div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">🧾</div>
              <div className="info-card-title">Ledger Entry</div>
              <div className="info-card-desc">Every upload is logged as PURCHASE in the stock ledger</div>
            </div>
          </div>

          {/* TEMPLATE */}
          <div className="template-box">
            <div className="template-left">
              <div className="template-icon">📋</div>
              <div>
                <div className="template-title">Download Sample Template</div>
                <div className="template-sub">Use this format for your Excel file</div>
                <div className="template-cols">
                  <span className="col-pill">SKU</span>
                  <span className="col-pill">Name</span>
                  <span className="col-pill">Quantity</span>
                </div>
              </div>
            </div>
            <button className="dl-btn" onClick={downloadTemplate}>⬇ Download Template</button>
          </div>

          {/* DROP ZONE */}
          <div
            className={`dropzone ${dragging ? "drag" : ""} ${file ? "has-file" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <div className="drop-icon">✅</div>
                <div className="drop-title">File Ready</div>
                <div className="file-name">📄 {file.name}</div>
                <div className="file-size">{(file.size / 1024).toFixed(1)} KB · Click to change</div>
              </>
            ) : (
              <>
                <div className="drop-icon">📁</div>
                <div className="drop-title">{dragging ? "Drop it here!" : "Drop your Excel file here"}</div>
                <div className="drop-sub">or click to browse · .xlsx and .xls supported</div>
              </>
            )}
          </div>

          {/* UPLOAD BUTTON */}
          <button
            className="upload-btn"
            onClick={upload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                Processing…
              </>
            ) : (
              <>⬆ Upload & Update Stock</>
            )}
          </button>

          {/* RESULTS */}
          {result && (
            <div className="result-box">
              <div className="result-header">
                <div className="stat-pill stat-pill-green">
                  <div className="stat-num stat-num-green">{result.processed}</div>
                  <div className="stat-label">✓ Updated</div>
                </div>
                <div className="stat-pill stat-pill-red">
                  <div className="stat-num stat-num-red">{result.failed}</div>
                  <div className="stat-label">✕ Failed</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="errors-box">
                  <div className="errors-head">⚠ Failed Rows — Check SKU or Name</div>
                  {result.errors.map((e, i) => (
                    <div key={i} className="error-row">
                      <div className="error-sku">{e.row.SKU || e.row.Name || `Row ${i + 1}`}</div>
                      <div>
                        <div className="error-name">{e.row.Name || "—"}</div>
                        <div className="error-msg">{e.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.processed > 0 && result.failed === 0 && (
                <div style={{ textAlign: "center", padding: "16px", fontSize: 13, color: "var(--green)" }}>
                  🎉 All rows processed successfully!
                </div>
              )}
            </div>
          )}
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
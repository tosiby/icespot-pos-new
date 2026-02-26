"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
/* ─── Types ──────────────────────────────────────────────────────────────── */

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  category_name: string;
  current_stock: number;
  reorder_level: number;
};

type CartItem = {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
};

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function BillingPage() {
const router = useRouter();
  const [shiftOpen, setShiftOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [loading, setLoading] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [me, setMe] = useState<any>(null);
  const [lastBill, setLastBill] = useState<any>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [shiftStatus, setShiftStatus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadTodayTotal();
    loadMe();
    loadLastBill();
    loadShiftStatus();
  }, []);

  // "/" shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") searchRef.current?.blur();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ─── Toast ──────────────────────────────────────────────────────────── */

  function showToast(msg: string, type: "success" | "error" | "info" = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  /* ─── Loaders ────────────────────────────────────────────────────────── */

  async function loadShiftStatus() {
    try {
      const res = await fetch("/api/reports/shift-status");
      if (!res.ok) return;
      const d = await res.json();
      setShiftStatus(d);
      setShiftOpen(Boolean(d?.open));
    } catch (err) {
      console.error("shift status failed", err);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch("/api/products/list");
      if (!res.ok) return;
      const data = await res.json();
      const safe: Product[] = Array.isArray(data) ? data : [];
      setProducts(safe);
      setCategories(Array.from(new Set(safe.map((p) => p.category_name))).sort());
    } catch (err) {
      console.error("LOAD PRODUCTS FAILED:", err);
    }
  }

  async function loadTodayTotal() {
    try {
      const res = await fetch("/api/reports/today");
      if (!res.ok) return;
      const data = await res.json();
      setTodayTotal(Number(data?.total || 0));
    } catch {}
  }

  async function loadMe() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) setMe(await res.json());
    } catch {}
  }

  async function loadLastBill() {
    try {
      const res = await fetch("/api/reports/last-bill");
      if (res.ok) setLastBill(await res.json());
    } catch {}
  }

  /* ─── Shift ──────────────────────────────────────────────────────────── */

  async function confirmOpenShift() {
    const cash = Number(openingCash);
    if (!openingCash || isNaN(cash) || cash < 0) {
      showToast("Enter a valid opening cash amount", "error");
      return;
    }
    const res = await fetch("/api/reports/shift-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opening_cash: cash }),
    });
    if (!res.ok) { showToast("Failed to open shift", "error"); return; }
    setShowOpenModal(false);
    setOpeningCash("");
    showToast("Shift opened successfully!", "success");
    await loadShiftStatus();
  }

  async function confirmCloseShift() {
    const cash = Number(closingCash);
    if (!closingCash || isNaN(cash) || cash < 0) {
      showToast("Enter counted cash amount", "error");
      return;
    }
    const res = await fetch("/api/reports/shift-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closing_cash: cash }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err?.error || "Failed to close shift", "error");
      return;
    }
    setShowCloseModal(false);
    setClosingCash("");
    showToast("Shift closed", "info");
    await loadShiftStatus();
    await loadTodayTotal();
    window.location.reload();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  /* ─── Cart ───────────────────────────────────────────────────────────── */

  function getQty(productId: string) {
    return cart.find((x) => x.product_id === productId)?.quantity ?? 0;
  }

  function addToCart(p: Product) {
    const existingQty = getQty(p.id);
    if (existingQty >= p.current_stock) return; // 🔒 HARD STOCK GUARD
    setCart((prev) => {
      const existing = prev.find((x) => x.product_id === p.id);
      if (existing) {
        return prev.map((x) =>
          x.product_id === p.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      return [...prev, { product_id: p.id, sku: p.sku, name: p.name, quantity: 1, unit_price: p.price }];
    });
  }

  function decrement(productId: string) {
    setCart((prev) =>
      prev
        .map((x) => x.product_id === productId ? { ...x, quantity: x.quantity - 1 } : x)
        .filter((x) => x.quantity > 0)
    );
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  /* ─── Stock State ────────────────────────────────────────────────────── */

  function getStockState(p: Product) {
    const isOut = p.current_stock <= 0;
    const isLow = !isOut && p.reorder_level > 0 && p.current_stock <= p.reorder_level;
    const isCritical = !isOut && p.reorder_level > 0 && p.current_stock <= Math.ceil(p.reorder_level * 0.5);
    return { isOut, isLow, isCritical };
  }

  /* ─── Filter + Sort ──────────────────────────────────────────────────── */

  const filteredBase = activeCat === "ALL"
    ? products
    : products.filter((p) => p.category_name === activeCat);

  const filtered = [...filteredBase]
    .filter((p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const sa = getStockState(a);
      const sb = getStockState(b);
      const priority = (s: any) => s.isOut ? 0 : s.isCritical ? 1 : s.isLow ? 2 : 3;
      return priority(sa) - priority(sb);
    });

  const total = cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  /* ─── Stock Summary ──────────────────────────────────────────────────── */

  let outCount = 0, criticalCount = 0, lowCount = 0;
  products.forEach((p) => {
    const s = getStockState(p);
    if (s.isOut) outCount++;
    else if (s.isCritical) criticalCount++;
    else if (s.isLow) lowCount++;
  });

  /* ─── Place Order ────────────────────────────────────────────────────── */

  async function placeOrder() {
    if (!shiftOpen) { showToast("Shift is closed — open a shift first", "error"); return; }
    if (!cart.length) { showToast("Cart is empty", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_amount: total,
          payment_mode: paymentMode,
          items: cart.map((i) => ({
            sku: i.sku,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        }),
      });
      setLoading(false);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err?.error || "Sale failed", "error");
        return;
      }
      const data = await res.json();
      printReceipt(cart, total, paymentMode, data?.invoice_number);
      showToast(`₹${total.toFixed(2)} via ${paymentMode} — done!`, "success");
      setCart([]);
      loadTodayTotal();
      loadLastBill();
    } catch {
      setLoading(false);
      showToast("Network error", "error");
    }
  }

  /* ─── Reprint ────────────────────────────────────────────────────────── */

  function reprintLastBill() {
    if (!lastBill) return;
    printReceipt(
      lastBill.items?.map((i: any) => ({
        product_id: "", sku: "", name: i.name,
        quantity: i.quantity, unit_price: i.total / i.quantity,
      })) || [],
      lastBill.total_amount,
      lastBill.payment_mode || "—",
      lastBill.invoice_number
    );
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #06090f;
          --surface: rgba(255,255,255,0.035);
          --surface-2: rgba(255,255,255,0.06);
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
          --text-muted: #2d3f55;
          --radius: 16px;
          --radius-sm: 10px;
        }

        html, body { height: 100%; overflow: hidden; background: var(--bg); }

        .pos-root {
          font-family: 'Outfit', sans-serif;
          background: var(--bg); color: var(--text);
          height: 100vh; display: flex; flex-direction: column;
          overflow: hidden; position: relative;
        }
        .pos-root::before {
          content: ''; position: fixed; top: -250px; left: -200px;
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }
        .pos-root::after {
          content: ''; position: fixed; bottom: -200px; right: -150px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }

        /* TOP BAR */
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; height: 56px;
          background: rgba(6,9,15,0.9); border-bottom: 1px solid var(--border);
          backdrop-filter: blur(24px); position: relative; z-index: 50; flex-shrink: 0;
        }
        .topbar-brand { display: flex; align-items: center; gap: 10px; }
        .brand-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, var(--ice), #0099bb);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-size: 16px; box-shadow: 0 0 14px var(--ice-glow);
        }
        .brand-name { font-size: 15px; font-weight: 700; letter-spacing: 1.5px; color: #fff; }
        .brand-sub { font-size: 10px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; margin-top: -2px; }

        .shift-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .shift-pill-open { background: var(--green-dim); border: 1px solid rgba(52,211,153,0.28); color: var(--green); }
        .shift-pill-closed { background: var(--red-dim); border: 1px solid rgba(248,113,113,0.28); color: var(--red); }
        .shift-dot { width: 6px; height: 6px; border-radius: 50%; }
        .dot-open { background: var(--green); animation: dot-pulse 2s infinite; }
        .dot-closed { background: var(--red); }
        @keyframes dot-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .topbar-staff {
          display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim);
          padding: 5px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
        }
        .today-total {
          font-family: 'DM Mono', monospace; font-size: 12px; color: var(--ice);
          padding: 5px 12px; background: var(--ice-dim); border: 1px solid var(--border-bright); border-radius: 20px;
        }
        .nav-btn {
          padding: 5px 13px; border-radius: 8px; border: 1px solid var(--border);
          background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: none;
          display: flex; align-items: center; gap: 5px; transition: all 0.15s;
        }
        .nav-btn:hover { background: var(--surface-2); color: var(--text); border-color: var(--border-bright); }

        /* MAIN */
        .main-layout { display: flex; flex: 1; overflow: hidden; position: relative; z-index: 1; }

        /* PRODUCTS */
        .products-panel {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; padding: 14px 14px 14px 18px; gap: 10px;
        }
        .controls-row { display: flex; gap: 10px; flex-shrink: 0; align-items: center; }
        .search-wrap { position: relative; flex: 1; }
        .search-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          color: var(--text-dim); font-size: 14px; pointer-events: none;
        }
        .search-input {
          width: 100%; padding: 9px 36px 9px 33px; background: var(--surface);
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          color: var(--text); font-family: 'Outfit', sans-serif; font-size: 13px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .search-input::placeholder { color: var(--text-muted); }
        .search-input:focus { border-color: var(--border-bright); box-shadow: 0 0 0 3px var(--ice-dim); }
        .search-shortcut {
          position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
          font-family: 'DM Mono', monospace; font-size: 9px; color: var(--text-muted);
          background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 4px; padding: 1px 4px;
        }
        .cat-tabs { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
        .cat-tab {
          padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border);
          background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .cat-tab:hover { background: var(--surface-2); color: var(--text); }
        .cat-tab.active { background: var(--ice-dim); border-color: var(--border-bright); color: var(--ice); font-weight: 600; }

        .stock-alerts { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
        .alert-chip { display: flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 600; }
        .chip-amber { background: var(--amber-dim); border: 1px solid rgba(251,191,36,0.25); color: var(--amber); }
        .chip-orange { background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.25); color: #fb923c; }
        .chip-red { background: var(--red-dim); border: 1px solid rgba(248,113,113,0.25); color: var(--red); }

        .product-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
          gap: 9px; overflow-y: auto; padding-right: 3px; align-content: start;
        }
        .product-grid::-webkit-scrollbar { width: 3px; }
        .product-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        .product-tile {
          background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
          padding: 13px 11px; cursor: pointer; transition: all 0.15s cubic-bezier(0.4,0,0.2,1);
          display: flex; flex-direction: column; gap: 5px;
          position: relative; overflow: hidden; user-select: none;
        }
        .product-tile::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, var(--ice-dim), transparent);
          opacity: 0; transition: opacity 0.15s;
        }
        .product-tile:hover:not(.tile-disabled) { transform: translateY(-2px); border-color: var(--border-bright); box-shadow: 0 6px 20px rgba(0,0,0,0.4), 0 0 0 1px var(--ice-dim); }
        .product-tile:hover:not(.tile-disabled)::before { opacity: 1; }
        .product-tile:active:not(.tile-disabled) { transform: scale(0.97); }
        .tile-disabled { opacity: 0.3; cursor: not-allowed; }
        .tile-name { font-size: 12px; font-weight: 600; line-height: 1.3; color: var(--text); position: relative; }
        .tile-price { font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 500; color: var(--ice); position: relative; }
        .tile-cat { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; position: relative; }
        .tile-badge { position: absolute; top: 7px; right: 7px; font-size: 8px; font-weight: 800; padding: 2px 5px; border-radius: 4px; letter-spacing: 0.5px; z-index: 1; }
        .badge-critical { background: rgba(249,115,22,0.2); color: #fb923c; }
        .badge-low { background: var(--amber-dim); color: var(--amber); }
        .badge-out { background: var(--red-dim); color: var(--red); }
        .qty-bubble {
          position: absolute; top: 7px; right: 7px; width: 19px; height: 19px;
          border-radius: 50%; background: var(--ice); color: #06090f;
          font-size: 10px; font-weight: 700; display: flex; align-items: center;
          justify-content: center; font-family: 'DM Mono', monospace; z-index: 1;
        }

        /* CART */
        .cart-panel {
          width: 300px; flex-shrink: 0; border-left: 1px solid var(--border);
          display: flex; flex-direction: column;
          background: rgba(6,9,15,0.65); backdrop-filter: blur(12px);
          position: relative; overflow: hidden;
        }
        .cart-header {
          padding: 13px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .cart-title { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text); display: flex; align-items: center; gap: 7px; }
        .cart-badge { background: var(--ice-dim); border: 1px solid var(--border-bright); color: var(--ice); font-size: 10px; font-weight: 700; border-radius: 10px; padding: 1px 6px; font-family: 'DM Mono', monospace; }
        .clear-all { font-size: 11px; color: var(--text-dim); background: none; border: none; cursor: pointer; padding: 3px 7px; border-radius: 6px; font-family: 'Outfit', sans-serif; transition: all 0.12s; }
        .clear-all:hover { background: var(--red-dim); color: var(--red); }

        .cart-items { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 5px; }
        .cart-items::-webkit-scrollbar { width: 3px; }
        .cart-items::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        .cart-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); }
        .cart-empty-icon { font-size: 36px; opacity: 0.35; }
        .cart-empty-text { font-size: 12px; }

        .cart-item {
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
          padding: 9px 11px; display: flex; align-items: center; gap: 8px; transition: border-color 0.1s;
        }
        .cart-item:hover { border-color: rgba(255,255,255,0.11); }
        .cart-item-info { flex: 1; min-width: 0; }
        .cart-item-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cart-item-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text-dim); margin-top: 1px; }
        .cart-item-controls { display: flex; align-items: center; gap: 5px; }
        .qty-btn {
          width: 21px; height: 21px; border-radius: 6px; border: 1px solid var(--border);
          background: rgba(255,255,255,0.05); color: var(--text); font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.1s;
          font-family: 'Outfit', sans-serif; line-height: 1;
        }
        .qty-btn:hover:not(:disabled) { background: var(--surface-2); border-color: var(--border-bright); }
        .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .qty-val { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; min-width: 16px; text-align: center; }
        .remove-btn {
          width: 19px; height: 19px; border-radius: 5px; border: none; background: none;
          color: var(--text-muted); font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.1s; line-height: 1;
        }
        .remove-btn:hover { background: var(--red-dim); color: var(--red); }
        .cart-item-total { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text); white-space: nowrap; }

        /* CART FOOTER */
        .cart-footer { border-top: 1px solid var(--border); padding: 12px; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }
        .total-row { display: flex; justify-content: space-between; align-items: baseline; }
        .total-label { font-size: 11px; color: var(--text-dim); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
        .total-value { font-family: 'DM Mono', monospace; font-size: 24px; font-weight: 500; color: #fff; letter-spacing: -0.5px; }

        .pay-modes { display: flex; gap: 5px; }
        .pay-mode-btn {
          flex: 1; padding: 8px 4px; border-radius: var(--radius-sm); border: 1px solid var(--border);
          background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif;
          font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.15s;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
        }
        .pay-mode-btn .mode-emoji { font-size: 15px; }
        .pay-mode-btn:hover { background: var(--surface-2); color: var(--text); }
        .mode-CASH.active { background: var(--green-dim); border-color: rgba(52,211,153,0.35); color: var(--green); box-shadow: 0 0 10px rgba(52,211,153,0.12); }
        .mode-UPI.active { background: var(--ice-dim); border-color: var(--border-bright); color: var(--ice); box-shadow: 0 0 10px rgba(0,212,255,0.12); }
        .mode-CARD.active { background: var(--purple-dim); border-color: rgba(167,139,250,0.35); color: var(--purple); box-shadow: 0 0 10px rgba(167,139,250,0.12); }

        .pay-btn {
          width: 100%; padding: 14px; border-radius: 13px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.3px;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          position: relative; overflow: hidden;
        }
        .pay-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%); transition: transform 0.45s;
        }
        .pay-btn:hover:not(:disabled)::after { transform: translateX(100%); }
        .pay-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .pay-btn:active:not(:disabled) { transform: scale(0.99); }
        .pay-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pay-btn.paying { animation: btn-pulse 1s infinite; }
        @keyframes btn-pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        .btn-CASH { background: linear-gradient(135deg,#059669,#34d399); color:#fff; box-shadow: 0 4px 18px rgba(52,211,153,0.28); }
        .btn-UPI { background: linear-gradient(135deg,#0099bb,#00d4ff); color:#06090f; box-shadow: 0 4px 18px rgba(0,212,255,0.28); }
        .btn-CARD { background: linear-gradient(135deg,#7c3aed,#a78bfa); color:#fff; box-shadow: 0 4px 18px rgba(167,139,250,0.28); }

        .util-row { display: flex; gap: 6px; }
        .util-btn {
          flex: 1; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border);
          background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif;
          font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .util-btn:hover { background: var(--surface-2); color: var(--text); }
        .util-btn-danger:hover { background: var(--red-dim); border-color: rgba(248,113,113,0.3); color: var(--red); }
        .util-btn-green:hover { background: var(--green-dim); border-color: rgba(52,211,153,0.3); color: var(--green); }

        /* SHIFT LOCK */
        .shift-locked {
          position: absolute; inset: 0; background: rgba(6,9,15,0.88); backdrop-filter: blur(8px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; z-index: 40;
        }
        .locked-icon { font-size: 44px; opacity: 0.45; }
        .locked-title { font-size: 16px; font-weight: 700; color: var(--text-dim); }
        .locked-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
        .open-shift-btn {
          padding: 11px 24px; border-radius: 10px; border: none;
          background: linear-gradient(135deg,#059669,#34d399); color: #fff;
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(52,211,153,0.25);
        }
        .open-shift-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }

        /* MODALS */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 9999;
          animation: fade-in 0.15s ease;
        }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        .modal-box {
          background: #090e1a; border: 1px solid var(--border-bright); border-radius: 20px;
          padding: 28px; width: 320px; text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 40px var(--ice-dim);
          animation: slide-up 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .modal-icon { font-size: 38px; margin-bottom: 10px; }
        .modal-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 5px; }
        .modal-sub { font-size: 12px; color: var(--text-dim); margin-bottom: 18px; }
        .modal-hint { margin-top: 6px; font-size: 11px; color: var(--text-dim); font-family: 'DM Mono', monospace; }
        .modal-input {
          width: 100%; padding: 12px 14px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: rgba(0,0,0,0.35);
          color: var(--text); font-family: 'DM Mono', monospace; font-size: 18px; outline: none;
          text-align: center; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .modal-input::placeholder { color: var(--text-muted); font-size: 14px; }
        .modal-input:focus { border-color: var(--border-bright); box-shadow: 0 0 0 3px var(--ice-dim); }
        .modal-actions { display: flex; gap: 8px; margin-top: 16px; }
        .modal-actions > * { flex: 1; }
        .m-btn {
          padding: 11px; border-radius: 10px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
        }
        .m-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .m-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .m-btn-green { background: linear-gradient(135deg,#059669,#34d399); color:#fff; box-shadow:0 4px 14px rgba(52,211,153,0.25); }
        .m-btn-red { background: linear-gradient(135deg,#dc2626,#f87171); color:#fff; box-shadow:0 4px 14px rgba(248,113,113,0.25); }
        .m-btn-grey { background: var(--surface-2); color: var(--text-dim); border: 1px solid var(--border); }

        /* TOAST */
        .toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          padding: 11px 18px; border-radius: 10px; font-size: 13px; font-weight: 500;
          z-index: 99999; display: flex; align-items: center; gap: 7px;
          animation: toast-in 0.25s cubic-bezier(0.4,0,0.2,1); backdrop-filter: blur(20px);
          white-space: nowrap; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        @keyframes toast-in { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .toast-success { background: rgba(6,55,40,0.95); border:1px solid rgba(52,211,153,0.4); color:var(--green); }
        .toast-error { background: rgba(60,10,10,0.95); border:1px solid rgba(248,113,113,0.4); color:var(--red); }
        .toast-info { background: rgba(7,18,38,0.95); border:1px solid var(--border-bright); color:var(--ice); }
      `}</style>

      <div className="pos-root">
        {/* TOP BAR */}
        <div className="topbar">
          <div className="topbar-brand">
            <div className="brand-icon">🧊</div>
            <div>
              <div className="brand-name">ICEPOS</div>
              <div className="brand-sub">Billing</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`shift-pill ${shiftOpen ? "shift-pill-open" : "shift-pill-closed"}`}>
              <span className={`shift-dot ${shiftOpen ? "dot-open" : "dot-closed"}`} />
              {shiftOpen ? "Shift Open" : "Shift Closed"}
              {shiftOpen && shiftStatus?.expected_cash !== undefined && (
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, opacity: 0.75, marginLeft: 4 }}>
                  · ₹{shiftStatus.expected_cash} expected
                </span>
              )}
            </div>
          </div>

          <div className="topbar-right">
            {me?.name && (
              <div className="topbar-staff">👤 <span style={{ color: "var(--text)" }}>{me.name}</span></div>
            )}
            <div className="today-total">Today ₹{todayTotal.toFixed(2)}</div><button
  className="nav-btn"
  onClick={() => router.push("/dashboard")}
>
  📊 Dashboard
</button>
            <a href="/shift-history" className="nav-btn">📁 History</a>
            <button className="nav-btn" onClick={logout}>🚪 Logout</button>
          </div>
        </div>

        {/* MAIN */}
        <div className="main-layout">

          {/* PRODUCTS PANEL */}
          <div className="products-panel">
            <div className="controls-row">
              <div className="search-wrap">
                <span className="search-icon">⌕</span>
                <input
                  ref={searchRef}
                  className="search-input"
                  placeholder="Search name or SKU…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="search-shortcut">/</span>
              </div>
            </div>

            <div className="cat-tabs">
              {["ALL", ...categories].map((cat) => (
                <button
                  key={cat}
                  className={`cat-tab ${activeCat === cat ? "active" : ""}`}
                  onClick={() => setActiveCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {(outCount > 0 || criticalCount > 0 || lowCount > 0) && (
              <div className="stock-alerts">
                {criticalCount > 0 && <span className="alert-chip chip-orange">🔥 {criticalCount} critical</span>}
                {lowCount > 0 && <span className="alert-chip chip-amber">⚠ {lowCount} low</span>}
                {outCount > 0 && <span className="alert-chip chip-red">✕ {outCount} out of stock</span>}
              </div>
            )}

            <div className="product-grid">
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  No products found
                </div>
              )}
              {filtered.map((p) => {
                const { isOut, isLow, isCritical } = getStockState(p);
                const qty = getQty(p.id);
                return (
                  <div
                    key={p.id}
                    className={`product-tile ${isOut ? "tile-disabled" : ""}`}
                    onClick={() => !isOut && addToCart(p)}
                  >
                    {qty > 0 && !isOut ? (
                      <div className="qty-bubble">{qty}</div>
                    ) : isOut ? (
                      <div className="tile-badge badge-out">OUT</div>
                    ) : isCritical ? (
                      <div className="tile-badge badge-critical">CRIT</div>
                    ) : isLow ? (
                      <div className="tile-badge badge-low">LOW</div>
                    ) : null}
                    <div className="tile-name">{p.name}</div>
                    <div className="tile-price">₹{Number(p.price).toFixed(2)}</div>
                    <div className="tile-cat">{p.category_name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CART PANEL */}
          <div className="cart-panel">
            <div className="cart-header">
              <div className="cart-title">
                Cart
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </div>
              {cart.length > 0 && (
                <button className="clear-all" onClick={() => setCart([])}>Clear all</button>
              )}
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="cart-empty">
                  <div className="cart-empty-icon">🛒</div>
                  <div className="cart-empty-text">Tap a product to add</div>
                </div>
              ) : (
                cart.map((item, i) => {
                  const prod = products.find((p) => p.id === item.product_id);
                  const atMax = item.quantity >= (prod?.current_stock ?? 0);
                  return (
                    <div key={i} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-sub">₹{item.unit_price.toFixed(2)} each</div>
                      </div>
                      <div className="cart-item-controls">
                        <button className="qty-btn" onClick={() => decrement(item.product_id)}>−</button>
                        <span className="qty-val">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => prod && addToCart(prod)} disabled={atMax}>+</button>
                      </div>
                      <div className="cart-item-total">₹{(item.unit_price * item.quantity).toFixed(2)}</div>
                      <button className="remove-btn" onClick={() => removeItem(i)}>✕</button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cart-footer">
              <div className="total-row">
                <span className="total-label">Total</span>
                <span className="total-value">₹{total.toFixed(2)}</span>
              </div>

              <div className="pay-modes">
                {(["CASH", "UPI", "CARD"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`pay-mode-btn mode-${mode} ${paymentMode === mode ? "active" : ""}`}
                    onClick={() => setPaymentMode(mode)}
                  >
                    <span className="mode-emoji">
                      {mode === "CASH" ? "💵" : mode === "UPI" ? "📲" : "💳"}
                    </span>
                    {mode}
                  </button>
                ))}
              </div>

              <button
                className={`pay-btn btn-${paymentMode} ${loading ? "paying" : ""}`}
                onClick={placeOrder}
                disabled={loading || cart.length === 0 || !shiftOpen}
              >
                {loading ? "Processing…" : `Pay ₹${total.toFixed(2)} · ${paymentMode}`}
              </button>

              <div className="util-row">
                {lastBill && (
                  <button className="util-btn" onClick={reprintLastBill}>🖨 Reprint</button>
                )}
                {shiftOpen ? (
                  <button className="util-btn util-btn-danger" onClick={() => setShowCloseModal(true)}>
                    🔒 Close Shift
                  </button>
                ) : (
                  <button className="util-btn util-btn-green" onClick={() => setShowOpenModal(true)}>
                    🟢 Open Shift
                  </button>
                )}
              </div>
            </div>

            {!shiftOpen && (
              <div className="shift-locked">
                <div className="locked-icon">🔒</div>
                <div className="locked-title">Shift is Closed</div>
                <div className="locked-sub">Open a shift to start billing</div>
                <button className="open-shift-btn" onClick={() => setShowOpenModal(true)}>
                  🟢 Open Shift
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OPEN SHIFT MODAL */}
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🧊</div>
            <div className="modal-title">Open New Shift</div>
            <div className="modal-sub">Enter the opening cash in your drawer</div>
            <input
              type="number"
              className="modal-input"
              placeholder="₹ 0.00"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmOpenShift()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="m-btn m-btn-grey" onClick={() => setShowOpenModal(false)}>Cancel</button>
              <button className="m-btn m-btn-green" onClick={confirmOpenShift} disabled={!openingCash}>
                Start Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🔒</div>
            <div className="modal-title">Close Shift</div>
            <div className="modal-sub">Count your drawer and enter the total cash</div>
            {shiftStatus?.expected_cash !== undefined && (
              <div className="modal-hint">Expected in drawer: ₹{shiftStatus.expected_cash}</div>
            )}
            <input
              type="number"
              className="modal-input"
              placeholder="₹ 0.00"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmCloseShift()}
              autoFocus
              style={{ marginTop: 10 }}
            />
            <div className="modal-actions">
              <button className="m-btn m-btn-grey" onClick={() => setShowCloseModal(false)}>Cancel</button>
              <button className="m-btn m-btn-red" onClick={confirmCloseShift} disabled={!closingCash}>
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
          {toast.msg}
        </div>
      )}
    </>
  );
}

/* ─── Receipt Printer ────────────────────────────────────────────────────── */

function printReceipt(cart: CartItem[], total: number, paymentMode: string, invoiceNumber?: string) {
  const win = window.open("", "RECEIPT", "width=380,height=640");
  if (!win) return;
  const rows = cart.map((i) =>
    `<tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">₹${(i.unit_price * i.quantity).toFixed(2)}</td>
    </tr>`
  ).join("");
  win.document.write(`
    <html><head><title>Receipt</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;width:300px;padding:14px;font-size:12px}
      h2{text-align:center;font-size:18px;letter-spacing:2px}
      h4{text-align:center;font-weight:normal;font-size:11px;margin-top:2px}
      .line{border-top:1px dashed #000;margin:8px 0}
      table{width:100%}
      th{font-size:10px;text-align:left}
      th:nth-child(2),td:nth-child(2){text-align:center}
      th:nth-child(3),td:nth-child(3){text-align:right}
      .total-row{font-size:15px;font-weight:bold}
      .footer{text-align:center;margin-top:10px;font-size:10px}
    </style></head><body>
    <h2>🧊 ICE SPOT</h2>
    <h4>Your Favourite Ice Cream Shop</h4>
    <div class="line"></div>
    <div style="font-size:10px">${new Date().toLocaleString("en-IN")}</div>
    ${invoiceNumber ? `<div style="font-size:10px">Invoice: #${invoiceNumber}</div>` : ""}
    <div class="line"></div>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Amt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="line"></div>
    <table><tr class="total-row"><td>TOTAL</td><td></td><td style="text-align:right">₹${total.toFixed(2)}</td></tr></table>
    <div style="font-size:11px;margin-top:4px">Payment: ${paymentMode}</div>
    <div class="line"></div>
    <div class="footer"><p>Thank you for visiting! 🍦</p><p>Come back soon!</p></div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 300);
}
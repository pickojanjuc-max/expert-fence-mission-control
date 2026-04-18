"use client";

// Stripped-down aluminium calculator for embedded use on third-party stores.
// Reuses the same UI sub-panels as the dashboard calculator, but:
//   - no dashboard header, no Save Project, no session/localStorage
//   - adds an "Add to Cart" button at the bottom of the BOM tab
//   - posts messages to window.parent for (a) iframe auto-height and (b) cart
//
// Message formats sent to parent window:
//   { type: 'EF_HEIGHT', height: <number> }
//   { type: 'EF_ADD_TO_CART', token: <string>, items: [{ product_id, quantity, calc_sku, name }, ...] }
//   { type: 'EF_READY',  token: <string> }

import React, { useState, useEffect, useRef } from "react";
import { STYLE_CONFIG, SHAPE_MAP } from "@/lib/styleConfig";
import { getDefaultAluminiumRun } from "@/lib/aluminiumV2State";
import SidesPanel from "@/components/aluminium-v2/SidesPanel";
import RunSetupPanel from "@/components/aluminium-v2/RunSetupPanel";
import FinishesPanel from "@/components/aluminium-v2/FinishesPanel";
import BOMPanel from "@/components/aluminium-v2/BOMPanel";
import TopDownPreview from "@/components/aluminium-v2/TopDownPreview";

export default function AluminiumEmbedClient({ token, tenantName, skuMap }) {
  const [selectedStyle, setSelectedStyle] = useState("Tubular");
  const [colour, setColour] = useState("Black");
  const [mount, setMount] = useState("Surface");
  const [shape, setShape] = useState("Straight");
  const [runs, setRuns] = useState([getDefaultAluminiumRun()]);
  const [lastQuote, setLastQuote] = useState(null);
  const [selectedRun, setSelectedRun] = useState(0);
  const [rightTab, setRightTab] = useState("preview");
  const [cartState, setCartState] = useState("idle"); // idle | sending | sent | error
  const [cartMessage, setCartMessage] = useState("");

  const autoCalcTimer = useRef(null);
  const rootRef = useRef(null);

  // ── Announce readiness + ship height on resize ──────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.parent?.postMessage({ type: "EF_READY", token }, "*");

    const postHeight = () => {
      const h = document.documentElement.scrollHeight;
      window.parent?.postMessage({ type: "EF_HEIGHT", height: h }, "*");
    };
    postHeight();

    const ro = new ResizeObserver(postHeight);
    if (rootRef.current) ro.observe(rootRef.current);

    const id = setInterval(postHeight, 750);
    return () => {
      ro.disconnect();
      clearInterval(id);
    };
  }, [token]);

  // ── Auto-calc on config change ──────────────────────────────────────────
  useEffect(() => {
    if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    autoCalcTimer.current = setTimeout(async () => {
      const runCount = runs.filter((r) => Number(r.length_mm || 0) > 0).length;
      const sharedCorners = ({ Straight: 0, "L-shape": 1, "U-shape": 2, Box: 4 }[shape])
        ?? Math.max(0, runCount - 1);
      const payload = {
        style: selectedStyle,
        colour,
        mount,
        shape,
        runs,
        shared_corners: sharedCorners,
      };
      try {
        const response = await fetch("/api/quote/calculate-v5", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Quote API ${response.status}`);
        const data = await response.json();
        setLastQuote(data);
      } catch (err) {
        console.error("embed quote error:", err);
        setLastQuote(null);
      }
    }, 300);
    return () => { if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current); };
  }, [selectedStyle, colour, mount, shape, runs]);

  // ── Keep shape's run count in sync ──────────────────────────────────────
  // Also enforces the rectangle rule for Box shape: C mirrors A, D mirrors B
  // (sizing only — gates stay per-side).
  useEffect(() => {
    const target = SHAPE_MAP[shape];
    if (target === 0) return;

    let next = [...runs];
    if (next.length < target) {
      while (next.length < target) next.push(getDefaultAluminiumRun());
    } else if (next.length > target) {
      next = next.slice(0, target);
    }

    if (shape === "Box" && next.length === 4) {
      const aLen = Number(next[0]?.length_mm) || 6000;
      const bLen = Number(next[1]?.length_mm) || 6000;
      next[2] = { ...next[2], length_mm: aLen };
      next[3] = { ...next[3], length_mm: bLen };
    }

    const changed =
      next.length !== runs.length ||
      next.some((r, i) => r !== runs[i]);
    if (changed) setRuns(next);
  }, [shape]);

  // ── Ensure the selected colour is valid for the current style ───────────
  useEffect(() => {
    const valid = STYLE_CONFIG[selectedStyle]?.colours || [];
    if (!valid.includes(colour)) setColour(valid[0] || "Black");
  }, [selectedStyle, colour]);

  useEffect(() => {
    if (selectedRun >= runs.length) setSelectedRun(Math.max(0, runs.length - 1));
  }, [runs.length, selectedRun]);

  const updateRun = (idx, updates) => {
    const next = [...runs];
    next[idx] = { ...next[idx], ...updates };
    setRuns(next);
  };
  const deleteRun = (idx) => {
    if (runs.length <= 1) return;
    const next = runs.filter((_, i) => i !== idx);
    setRuns(next);
    if (selectedRun >= next.length) setSelectedRun(next.length - 1);
  };
  const addRun = () => {
    if (shape !== "Straight" || runs.length >= 5) return;
    setRuns([...runs, { length_mm: 6000, gate: false, gate_mode: "End", gate_after_panel: 1 }]);
  };

  // ── Add to Cart: resolve SKUs and postMessage to parent ─────────────────
  function handleAddToCart() {
    if (!lastQuote || !Array.isArray(lastQuote.bom) || lastQuote.bom.length === 0) {
      setCartState("error");
      setCartMessage("No items in your BOM yet — enter your measurements first.");
      return;
    }

    const items = [];
    const unmapped = [];
    for (const row of lastQuote.bom) {
      const sku = String(row.SKU || "").toUpperCase();
      const qty = parseFloat(row.Qty || 0);
      if (!sku || qty <= 0) continue;
      const map = skuMap[sku];
      if (!map || !map.product_id) {
        unmapped.push(sku);
        continue;
      }
      items.push({
        product_id: map.product_id,
        quantity: Math.ceil(qty),
        calc_sku: sku,
        name: map.product_name || row.Item || "",
      });
    }

    if (items.length === 0) {
      setCartState("error");
      setCartMessage("We couldn't match any items to this store's products. Please contact support.");
      return;
    }

    setCartState("sending");
    setCartMessage(unmapped.length > 0
      ? `Sent ${items.length} items. ${unmapped.length} could not be mapped: ${unmapped.join(", ")}`
      : `Sent ${items.length} items to cart.`);

    window.parent?.postMessage({
      type: "EF_ADD_TO_CART",
      token,
      items,
    }, "*");

    setTimeout(() => setCartState("sent"), 400);
    setTimeout(() => { setCartState("idle"); setCartMessage(""); }, 5000);
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-gray-50 flex flex-col">
      {/* Thin header — tenant name only, no nav */}
      <header className="bg-white border-b border-gray-200 px-3 md:px-5 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="w-6 h-6 bg-cyan-500 rounded-md flex items-center justify-center">
          <span className="text-white text-[10px] font-black">EF</span>
        </div>
        <span className="text-xs md:text-sm font-bold text-gray-800 tracking-wide flex-1">
          Aluminium Fence Calculator
        </span>
        {tenantName && (
          <span className="text-[10px] md:text-xs text-gray-400">{tenantName}</span>
        )}
      </header>

      {/* 3-column responsive layout */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* COL 1 — Sides */}
        <div className="w-full md:w-64 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
          <SidesPanel
            runs={runs}
            setRuns={setRuns}
            shape={shape}
            setShape={setShape}
            selectedRun={selectedRun}
            setSelectedRun={setSelectedRun}
            canAddRun={shape === "Straight" && runs.length < 5}
            onAddRun={addRun}
            onDeleteRun={deleteRun}
          />
        </div>

        {/* COL 2 — Configure */}
        <div className="w-full md:w-80 md:flex-shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Style & Mount</h3>
            <FinishesPanel
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              colour={colour}
              setColour={setColour}
              mount={mount}
              setMount={setMount}
            />
          </div>
          <div className="p-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              {shape === "Straight" ? `Run ${selectedRun + 1}` : `Side ${String.fromCharCode(65 + selectedRun)}`} — Gates
            </h3>
            <RunSetupPanel
              runs={runs}
              updateRun={updateRun}
              selectedRun={selectedRun}
              setSelectedRun={setSelectedRun}
            />
          </div>
        </div>

        {/* COL 3 — Preview / BOM + Add to Cart */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white border-b border-gray-200 px-2 md:px-4 flex flex-shrink-0">
            {[{ id: "preview", label: "Layout Preview" }, { id: "bom", label: "Bill of Materials" }].map(t => (
              <button
                key={t.id}
                onClick={() => setRightTab(t.id)}
                className={`px-3 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  rightTab === t.id
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1">
            {rightTab === "preview" ? (
              <div className="min-h-[420px] flex items-start justify-center p-2 md:p-4">
                <TopDownPreview shape={shape} runs={runs} selectedStyle={selectedStyle} />
              </div>
            ) : (
              <BOMPanel
                lastQuote={lastQuote}
                selectedStyle={selectedStyle}
                colour={colour}
                mount={mount}
                shape={shape}
                runs={runs}
              />
            )}
          </div>

          {/* Add to Cart — always visible when BOM is ready */}
          {lastQuote && Array.isArray(lastQuote.bom) && lastQuote.bom.length > 0 && (
            <div className="bg-white border-t border-gray-200 p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <div className="flex-1 min-w-0">
                {cartMessage && (
                  <div className={`text-xs md:text-sm ${cartState === "error" ? "text-red-600" : "text-emerald-600"}`}>
                    {cartMessage}
                  </div>
                )}
                {!cartMessage && lastQuote.summary && (
                  <div className="text-xs md:text-sm text-gray-500">
                    Estimated total: <span className="font-semibold text-gray-800">${Number(lastQuote.summary.total || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleAddToCart}
                disabled={cartState === "sending"}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 rounded-md transition-colors whitespace-nowrap"
              >
                {cartState === "sending" ? "Adding…" : cartState === "sent" ? "Added ✓" : "Add to Cart"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign } from "lucide-react";
import { buildBOM } from "@/lib/bomBuilder";
import { COST_MAP } from "@/lib/costData";

// `costMap` prop overrides the defaults when provided (per-tenant pricing).
// Falls back to COST_MAP so existing code paths that don't pass the prop
// keep working unchanged.

function parseSimpleCsv(raw) {
  const lines = String(raw || "").trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] || "").trim();
    });
    return row;
  });
}

function money(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BOMPanel({ runs, finishes, intersectionMap, shape, costMap }) {
  const { rows, consolidated, unsolved, validation = [] } = buildBOM(runs, finishes, intersectionMap, shape, { skuFamily: "balustrade" });
  const [skuToImage, setSkuToImage] = React.useState({});
  const cm = costMap || COST_MAP;

  React.useEffect(() => {
    let alive = true;
    const sources = [
      '/data/balustrade/glass.csv',
      '/data/balustrade/spigots.csv',
      '/data/balustrade/cover_plates.csv',
      '/data/balustrade/handrail_components.csv',
      '/data/balustrade/handrail_rails.csv',
    ];
    Promise.all(sources.map((s) => fetch(s).then((r) => (r.ok ? r.text() : '')).catch(() => '')))
      .then((texts) => {
        if (!alive) return;
        const m = {};
        for (const csv of texts) {
          for (const row of parseSimpleCsv(csv)) {
            if (row.sku) m[String(row.sku).toUpperCase()] = row.image_url || '';
          }
        }
        setSkuToImage(m);
      })
      .catch(() => {
        if (alive) setSkuToImage({});
      });
    return () => {
      alive = false;
    };
  }, []);

  if (rows.length === 0 && unsolved.length === 0 && validation.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Configure your sides to generate a bill of materials.</p>
      </div>
    );
  }

  // Enrich with pricing + detect missing
  let totalEx = 0;
  const missingPricing = [];
  const priced = consolidated.map((r) => {
    const key = String(r.sku || "").toUpperCase();
    const cost = cm[key];
    const unit = cost?.sell ?? null;
    if (unit == null) missingPricing.push(r.sku);
    const line = unit != null ? unit * (Number(r.qty) || 0) : null;
    if (line != null) totalEx += line;
    return { ...r, unit, line };
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Price summary */}
      {priced.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-gray-600 uppercase tracking-widest mb-1">Estimated total (ex GST)</p>
            <p className="text-2xl font-bold text-cyan-700">{money(totalEx)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-cyan-400 opacity-50" />
        </div>
      )}

      {/* Consolidated BOM */}
      {priced.length > 0 && (
        <Section title="Consolidated Materials">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 bg-gray-50">
                <Th>Image</Th><Th>SKU</Th><Th>Description</Th>
                <Th right>Qty</Th><Th right>Unit</Th><Th right>Line ex GST</Th>
              </tr>
            </thead>
            <tbody>
              {priced.map((r, i) => {
                const key = String(r.sku || "").toUpperCase();
                const imageUrl = skuToImage[key] || cm[key]?.img || "";
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={r.sku}
                          loading="lazy"
                          className="w-10 h-10 object-cover rounded border border-gray-200"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">No image</span>
                      )}
                    </Td>
                    <Td><code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">{r.sku}</code></Td>
                    <Td>{r.description}</Td>
                    <Td right><Badge className="font-mono text-xs">{r.qty}</Badge></Td>
                    <Td right>{r.unit != null ? money(r.unit) : <span className="text-gray-300">—</span>}</Td>
                    <Td right className="font-medium">{r.line != null ? money(r.line) : <span className="text-gray-300">—</span>}</Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td colSpan={5} className="py-2 px-3 text-right text-gray-700">Total ex GST</td>
                <td className="py-2 px-3 text-right text-cyan-700">{money(totalEx)}</td>
              </tr>
            </tfoot>
          </table>
        </Section>
      )}

      {/* Missing pricing warning */}
      {missingPricing.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            Missing pricing
          </div>
          <p className="text-xs text-amber-800">
            {missingPricing.join(", ")}
          </p>
        </div>
      )}

      {/* Validation warnings/errors */}
      {validation.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            Catalog Validation
          </div>
          <div className="space-y-1.5">
            {validation.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant={v.severity === "error" ? "destructive" : "secondary"} className="text-xs">{v.severity}</Badge>
                <span className="text-xs text-amber-800">{v.code}: {v.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unsolved warnings */}
      {unsolved.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            Unsolved Runs
          </div>
          <div className="space-y-1.5">
            {unsolved.map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">{u.run}</Badge>
                <span className="text-xs text-red-600">{u.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{title}</h3>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Th({ children, right }) {
  return <th className={`py-2 px-3 font-semibold text-left ${right ? "text-right" : ""}`}>{children}</th>;
}
function Td({ children, right, className = "" }) {
  return <td className={`py-2 px-3 ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}

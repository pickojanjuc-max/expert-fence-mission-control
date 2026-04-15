import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign } from "lucide-react";

function money(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BOMPanel({
  lastQuote,
  selectedStyle,
  colour,
  mount,
  shape,
  runs,
}) {
  if (!lastQuote) {
    return (
      <div className="text-center py-16 px-4 text-gray-400">
        <p className="text-sm">Configure your fence to generate a bill of materials.</p>
      </div>
    );
  }

  const bom = Array.isArray(lastQuote.bom) ? lastQuote.bom : [];
  const summary = lastQuote.summary || {};
  const totalEx = summary.total_ex_gst;
  const missingPricing = Array.isArray(summary.missing_pricing) ? summary.missing_pricing : [];

  if (bom.length === 0) {
    return (
      <div className="text-center py-16 px-4 text-gray-400">
        <p className="text-sm">No materials calculated. Check your configuration.</p>
      </div>
    );
  }

  const totalLengthM = (runs.reduce((sum, r) => sum + Number(r.length_mm || 0), 0) / 1000).toFixed(1);

  return (
    <div className="p-4 space-y-5">
      {/* Price summary */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-gray-600 uppercase tracking-widest mb-1">Estimated total (ex GST)</p>
            <p className="text-2xl font-bold text-cyan-700">{money(totalEx)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-cyan-400 opacity-50" />
        </div>
      </div>

      {/* Configuration summary */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Configuration</h3>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <p className="text-gray-500">Style</p>
            <p className="font-semibold text-gray-800">{selectedStyle}</p>
          </div>
          <div>
            <p className="text-gray-500">Colour</p>
            <p className="font-semibold text-gray-800">{colour}</p>
          </div>
          <div>
            <p className="text-gray-500">Mount</p>
            <p className="font-semibold text-gray-800">{mount}</p>
          </div>
          <div>
            <p className="text-gray-500">Shape</p>
            <p className="font-semibold text-gray-800">{shape}</p>
          </div>
          <div>
            <p className="text-gray-500">Runs</p>
            <p className="font-semibold text-gray-800">{runs.length}</p>
          </div>
          <div>
            <p className="text-gray-500">Total length</p>
            <p className="font-semibold text-gray-800">{totalLengthM}m</p>
          </div>
        </div>
      </div>

      {/* Materials table */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Materials</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-2 px-2 font-semibold text-left text-gray-600 w-12"></th>
                <th className="py-2 px-2 font-semibold text-left text-gray-600">Item</th>
                <th className="py-2 px-2 font-semibold text-left text-gray-600">SKU</th>
                <th className="py-2 px-2 font-semibold text-right text-gray-600">Qty</th>
                <th className="py-2 px-2 font-semibold text-right text-gray-600">Line ex GST</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((li, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 px-2">
                    {li.img ? (
                      <img
                        src={li.img}
                        alt={li.SKU}
                        className="w-9 h-9 object-contain rounded border border-gray-200"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <span className="inline-block w-9 h-9 bg-gray-100 rounded border border-gray-200" />
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-gray-800">{li.Item}</td>
                  <td className="py-1.5 px-2">
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-gray-600">{li.SKU}</code>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <Badge variant="outline" className="font-mono text-[10px]">{Number(li.Qty)}</Badge>
                  </td>
                  <td className="py-1.5 px-2 text-right font-medium text-gray-700">
                    {money(li["Line Sell (ex GST)"])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td colSpan={4} className="py-2 px-2 text-right text-gray-700">Total ex GST</td>
                <td className="py-2 px-2 text-right text-cyan-700">{money(totalEx)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-right">{summary.material_lines || bom.length} line{(summary.material_lines || bom.length) === 1 ? "" : "s"}</p>
      </div>

      {/* Missing pricing warning */}
      {missingPricing.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs mb-1.5">
            <AlertTriangle className="w-4 h-4" />
            Missing pricing
          </div>
          <p className="text-[11px] text-amber-800">
            {missingPricing.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

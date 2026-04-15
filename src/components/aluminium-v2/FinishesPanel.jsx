import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STYLE_CONFIG, STYLE_DEFS, MOUNT_TYPES } from "@/lib/styleConfig";

export default function FinishesPanel({
  selectedStyle,
  setSelectedStyle,
  colour,
  setColour,
  mount,
  setMount,
}) {
  const styleConfig = STYLE_CONFIG[selectedStyle] || {};
  const validColours = styleConfig.colours || [];

  return (
    <div className="p-4 space-y-6">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Style</p>
        <div className="grid grid-cols-1 gap-3">
          {STYLE_DEFS.map((styleDef) => (
            <button
              key={styleDef.name}
              onClick={() => setSelectedStyle(styleDef.name)}
              className={`flex gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                selectedStyle === styleDef.name
                  ? "border-cyan-500 bg-cyan-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <img
                src={styleDef.img}
                alt={styleDef.name}
                className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">{styleDef.name}</p>
                <p className="text-[10px] text-gray-600 line-clamp-2">{styleDef.blurb}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Colour</label>
        <RadioGroup value={colour || "Black"} onValueChange={setColour} className="flex flex-wrap gap-3">
          {validColours.map((c) => (
            <div key={c} className="flex items-center gap-1.5">
              <RadioGroupItem value={c} id={`colour-${c}`} className="w-3.5 h-3.5" />
              <label htmlFor={`colour-${c}`} className="text-xs cursor-pointer">
                {c}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Mount Type</label>
        <Select value={mount} onValueChange={setMount}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOUNT_TYPES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-gray-500 mt-1.5">
          {mount === "Surface" && "Posts mounted on surface (e.g. timber decks, concrete pads)"}
          {mount === "Inground" && "Posts concreted directly into ground"}
        </p>
      </div>
    </div>
  );
}

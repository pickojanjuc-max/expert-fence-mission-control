import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function FinishesPanel({ finishes, setFinishes }) {
  const update = (field, val) => {
    setFinishes({ ...finishes, [field]: val });
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">MADRID Spigot Colour</label>
        <RadioGroup value={finishes.spigotColour || "Satin"} onValueChange={(v) => update("spigotColour", v)} className="flex flex-wrap gap-3">
          {[
            { val: "Black", label: "Black" },
            { val: "Matte White", label: "Matte White" },
            { val: "Polished", label: "Polished" },
            { val: "Satin", label: "Satin" },
          ].map(c => (
            <div key={c.val} className="flex items-center gap-1.5">
              <RadioGroupItem value={c.val} id={`colour-${c.val}`} className="w-3.5 h-3.5" />
              <label htmlFor={`colour-${c.val}`} className="text-xs cursor-pointer">{c.label}</label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={!!finishes.handrailOn}
            onCheckedChange={(v) => update("handrailOn", !!v)}
            className="w-4 h-4"
          />
          <span className="text-xs font-semibold text-gray-700">Add handrail (whole project)</span>
        </label>
        {finishes.handrailOn && (
          <p className="text-[11px] text-gray-500 mt-1.5 ml-6 leading-snug">
            SUMMIT 25x21mm RHS, colour-matched to the spigot finish. Rails, joiners, 90° corners and wall plates calculated automatically.
          </p>
        )}
      </div>
    </div>
  );
}
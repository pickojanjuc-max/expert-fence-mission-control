import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function FinishesPanel({ finishes, setFinishes }) {
  const update = (field, val) => {
    if (field === "spigotProfile") {
      // Constraint: Round profile does not support black finish.
      if (val === "Round" && finishes.spigotFinish === "black") {
        setFinishes({ ...finishes, spigotProfile: val, spigotFinish: "satin" });
        return;
      }
    }
    setFinishes({ ...finishes, [field]: val });
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finishes</p>

      <div>
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">Spigot Profile</label>
        <RadioGroup value={finishes.spigotProfile} onValueChange={(v) => update("spigotProfile", v)} className="flex gap-3">
          {["Round", "Square"].map(p => (
            <div key={p} className="flex items-center gap-1.5">
              <RadioGroupItem value={p} id={`profile-${p}`} className="w-3.5 h-3.5" />
              <label htmlFor={`profile-${p}`} className="text-xs cursor-pointer">{p}</label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">Finish</label>
        {finishes.spigotProfile === "Round" && (
          <p className="text-[10px] text-amber-600 mb-1">Round profile does not support black finish.</p>
        )}
        <RadioGroup value={finishes.spigotFinish} onValueChange={(v) => update("spigotFinish", v)} className="flex flex-wrap gap-3">
          {[
            { val: "polish", label: "Polished" },
            { val: "satin", label: "Satin" },
            { val: "black", label: "Matt Black" },
            { val: "matt_white", label: "Matt White" },
          ].map(f => {
            const disabled = finishes.spigotProfile === "Round" && f.val === "black";
            return (
              <div key={f.val} className={`flex items-center gap-1.5 ${disabled ? "opacity-40" : ""}`}>
                <RadioGroupItem value={f.val} id={`finish-${f.val}`} className="w-3.5 h-3.5" disabled={disabled} />
                <label htmlFor={`finish-${f.val}`} className={`text-xs ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>{f.label}</label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    </div>
  );
}
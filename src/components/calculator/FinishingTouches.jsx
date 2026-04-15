import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Wrench, ShieldCheck } from "lucide-react";

export default function FinishingTouches({ finishes, setFinishes }) {
  const update = (field, val) => setFinishes({ ...finishes, [field]: val });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Spigot Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profile</Label>
            <RadioGroup value={finishes.spigotProfile} onValueChange={(v) => update("spigotProfile", v)} className="flex gap-4">
              {["Round", "Square"].map(p => (
                <div key={p} className="flex items-center gap-2">
                  <RadioGroupItem value={p} id={`profile-${p}`} />
                  <label htmlFor={`profile-${p}`} className="text-sm cursor-pointer">{p}</label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Finish</Label>
            <RadioGroup value={finishes.spigotFinish} onValueChange={(v) => update("spigotFinish", v)} className="flex flex-wrap gap-4">
              {[
                { val: "polish", label: "Polished" },
                { val: "satin", label: "Satin" },
                { val: "black", label: "Matt Black" },
                { val: "matt_white", label: "Matt White" },
              ].map(f => (
                <div key={f.val} className="flex items-center gap-2">
                  <RadioGroupItem value={f.val} id={`finish-${f.val}`} />
                  <label htmlFor={`finish-${f.val}`} className="text-sm cursor-pointer">{f.label}</label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="w-4 h-4 text-primary" />
            Fixings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fixing type</Label>
            <RadioGroup value={finishes.fixingType} onValueChange={(v) => update("fixingType", v)} className="flex gap-4">
              {["S/S Coach Screws", "S/S Dyna Bolts"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <RadioGroupItem value={f} id={`fixing-${f}`} />
                  <label htmlFor={`fixing-${f}`} className="text-sm cursor-pointer">{f}</label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cover ring</Label>
            <RadioGroup value={finishes.coverRing} onValueChange={(v) => update("coverRing", v)} className="flex gap-4">
              {["22mm Raised", "Flat"].map(c => (
                <div key={c} className="flex items-center gap-2">
                  <RadioGroupItem value={c} id={`ring-${c}`} />
                  <label htmlFor={`ring-${c}`} className="text-sm cursor-pointer">{c}</label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Extras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "extraCleaner", label: "EnduroShield Glass Cleaner" },
            { key: "extraStainless", label: "EnduroShield Stainless Treatment" },
            { key: "extraSign", label: "Resuscitation Sign" },
          ].map(item => (
            <div key={item.key} className="flex items-center gap-3">
              <Checkbox
                checked={finishes[item.key]}
                onCheckedChange={(v) => update(item.key, !!v)}
                id={item.key}
              />
              <label htmlFor={item.key} className="text-sm cursor-pointer">{item.label}</label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <span className="text-xs text-muted-foreground">
          This step does not alter geometry. It only changes BOM composition.
        </span>
      </div>
    </div>
  );
}
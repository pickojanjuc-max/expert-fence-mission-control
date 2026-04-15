import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles } from "lucide-react";

export default function FinishingTouches({ finishes, setFinishes }) {
  const update = (field, val) => setFinishes({ ...finishes, [field]: val });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Spigot Colour
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MADRID Spigot Colour</Label>
            <RadioGroup value={finishes.spigotColour || "Satin"} onValueChange={(v) => update("spigotColour", v)} className="flex flex-wrap gap-4">
              {[
                { val: "Black", label: "Black" },
                { val: "Matte White", label: "Matte White" },
                { val: "Polished", label: "Polished" },
                { val: "Satin", label: "Satin" },
              ].map(c => (
                <div key={c.val} className="flex items-center gap-2">
                  <RadioGroupItem value={c.val} id={`colour-${c.val}`} />
                  <label htmlFor={`colour-${c.val}`} className="text-sm cursor-pointer">{c.label}</label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProjectPreview from "./ProjectPreview";
import { Ruler } from "lucide-react";

export default function FenceRuns({ runs, setRuns, shape, setShape, runCount, setRunCount, sharedCorners, setSharedCorners, intersectionMap }) {
  const updateRunLength = (idx, val) => {
    const next = [...runs];
    next[idx] = { ...next[idx], length: Math.max(1000, Number(val) || 1000) };
    setRuns(next);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ruler className="w-5 h-5 text-primary" />
            Project Frame
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shape</Label>
              <Select value={shape} onValueChange={setShape}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Straight", "L-shape", "U-shape", "Box"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Run Count</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={runCount}
                onChange={(e) => setRunCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                disabled={shape !== "Straight"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shared Corners</Label>
              <Input
                type="number"
                min={0}
                max={8}
                value={sharedCorners}
                onChange={(e) => setSharedCorners(Math.max(0, Math.min(8, Number(e.target.value) || 0)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {runs.map((r, i) => (
              <div key={i} className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Run {String.fromCharCode(65 + i)} length (mm)
                </Label>
                <Input
                  type="number"
                  min={1000}
                  step={10}
                  value={r.length}
                  onChange={(e) => updateRunLength(i, e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Intersection: start={intersectionMap[i + 1]?.start ? "✓" : "–"} / end={intersectionMap[i + 1]?.end ? "✓" : "–"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-3">
          <ProjectPreview runs={runs} />
        </CardContent>
      </Card>
    </div>
  );
}
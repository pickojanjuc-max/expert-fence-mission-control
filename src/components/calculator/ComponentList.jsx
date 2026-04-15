import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, ClipboardList, Layers } from "lucide-react";
import { buildBOM } from "@/lib/bomBuilder";

export default function ComponentList({ runs, finishes, intersectionMap }) {
  const { rows, consolidated, runSummary, unsolved } = buildBOM(runs, finishes, intersectionMap);

  return (
    <div className="space-y-6">
      {/* Run Summary */}
      {runSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-primary" />
              Run Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Run</TableHead>
                    <TableHead className="text-xs">Panels</TableHead>
                    <TableHead className="text-xs">Internal Gap</TableHead>
                    <TableHead className="text-xs">Start Gap</TableHead>
                    <TableHead className="text-xs">End Gap</TableHead>
                    <TableHead className="text-xs">Gate Opening</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runSummary.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold">{r.run}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{r.panels}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.internalGap}mm</TableCell>
                      <TableCell className="font-mono text-sm">{r.startGap}mm</TableCell>
                      <TableCell className="font-mono text-sm">{r.endGap}mm</TableCell>
                      <TableCell className="font-mono text-sm">{r.gateOpening > 0 ? `${r.gateOpening}mm` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consolidated BOM */}
      {consolidated.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-primary" />
              Consolidated Component List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consolidated.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{r.sku}</code>
                      </TableCell>
                      <TableCell className="text-sm">{r.description}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="font-mono">{r.qty}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-run detail */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="w-4 h-4 text-primary" />
              Per-Run Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Run</TableHead>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-sm">{r.run}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{r.sku}</code>
                      </TableCell>
                      <TableCell className="text-sm">{r.description}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono">{r.qty}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 && unsolved.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No solvable runs yet. Go back to Step 2 to configure.</p>
          </CardContent>
        </Card>
      )}

      {/* Unsolved warnings */}
      {unsolved.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Unsolved Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unsolved.map((u, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-destructive/5">
                  <Badge variant="destructive" className="text-xs">{u.run}</Badge>
                  <span className="text-sm text-destructive">{u.reason}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
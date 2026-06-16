"use client";

import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Button }  from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";

interface FilterDef {
  key:   string;
  label: string;
  type:  "date" | "select";
  options?: { value: string; label: string }[];
}

interface Props {
  filters:    FilterDef[];
  values:     Record<string, string>;
  onChange:   (key: string, value: string) => void;
  onReset?:   () => void;
  onExport?:  () => void;
  exporting?: boolean;
  total?:     number;
}

export function ReportFilters({
  filters,
  values,
  onChange,
  onReset,
  onExport,
  exporting,
  total,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {filters.map((f) =>
        f.type === "date" ? (
          <div key={f.key} className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={values[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          </div>
        ) : (
          <div key={f.key} className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Select
              value={values[f.key] ?? "all"}
              onValueChange={(v) => onChange(f.key, v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder={`All ${f.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {f.label.toLowerCase()}s</SelectItem>
                {f.options?.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      )}

      <div className="flex items-end gap-2 ml-auto">
        {total !== undefined && (
          <span className="text-sm text-muted-foreground self-center">
            {total.toLocaleString()} rows
          </span>
        )}
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={exporting} className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}

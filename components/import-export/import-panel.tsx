"use client";

import { useRef, useState } from "react";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge }    from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle, XCircle, AlertCircle, Upload, FileText, Loader2,
} from "lucide-react";
import { exportCsv } from "@/lib/csv-export";

export interface ImportResult {
  [key: string]: number | string[];
  errors: string[];
}

interface TemplateCol {
  header:   string;
  example:  string;
  required: boolean;
  note?:    string;
}

interface Props {
  title:       string;
  description: string;
  template:    TemplateCol[];
  onImport:    (rows: Record<string, string>[]) => Promise<ImportResult>;
  resultLabels?: Record<string, string>;  // key → human label for the result numbers
}

function parseCsvToObjects(raw: string, headers: string[]): Record<string, string>[] {
  const lines = raw.trim().split(/\r?\n/);
  const firstLine = lines[0].toLowerCase().replace(/"/g, "");

  // Detect if first line is a header row
  const knownHeaders = headers.map((h) => h.toLowerCase());
  const isHeader = knownHeaders.some((h) => firstLine.includes(h));
  const startIdx = isHeader ? 1 : 0;

  return lines.slice(startIdx).map((line) => {
    const isTab = line.includes("\t");
    const parts = isTab ? line.split("\t") : line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (parts[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return obj;
  }).filter((r) => Object.values(r).some((v) => v.length > 0));
}

export function ImportPanel({ title, description, template, onImport, resultLabels = {} }: Props) {
  const [csv,     setCsv]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<ImportResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = template.map((c) => c.header);

  function downloadTemplate() {
    exportCsv(
      `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`,
      template.map((c) => c.header),
      [template.map((c) => c.example)]
    );
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setCsv(text);
  }

  async function handleImport() {
    if (!csv.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const rows = parseCsvToObjects(csv, headers);
      if (rows.length === 0) { setError("No data rows found."); setLoading(false); return; }
      const res = await onImport(rows);
      setResult(res);
      setCsv("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const resultEntries = result
    ? Object.entries(result).filter(([k]) => k !== "errors" && typeof result[k] === "number")
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Template info */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Expected columns</p>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-7 text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Download template
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {template.map((col) => (
            <div key={col.header} className="flex items-center gap-1">
              <Badge variant={col.required ? "default" : "secondary"} className="text-xs font-mono">
                {col.header}
              </Badge>
              {col.required && <span className="text-xs text-destructive">*</span>}
              {col.note && <span className="text-xs text-muted-foreground">({col.note})</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          * required &nbsp;·&nbsp; Header row is auto-detected &nbsp;·&nbsp; Comma or tab delimited
        </p>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {resultEntries.map(([k, v]) => (
              <Badge key={k} variant="secondary" className="gap-1.5 py-1 text-sm">
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                {v as number} {resultLabels[k] ?? k}
              </Badge>
            ))}
            {(result.errors?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="gap-1.5 py-1 text-sm">
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                {result.errors.length} errors
              </Badge>
            )}
          </div>
          {result.errors?.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-0.5 text-xs max-h-36 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Button variant="outline" size="sm" onClick={() => setResult(null)}>Import More</Button>
        </div>
      ) : (
        <Tabs defaultValue="paste">
          <TabsList className="h-8">
            <TabsTrigger value="paste"  className="text-xs px-3">Paste CSV</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs px-3">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">CSV Data</Label>
              <Textarea
                placeholder={`${headers.join(",")}\n${template.map((c) => c.example).join(",")}`}
                className="font-mono text-xs h-44 resize-none"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-3 space-y-3">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Drop a CSV file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">.csv files only</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            {csv && (
              <p className="text-xs text-muted-foreground">
                File loaded — {csv.trim().split("\n").length} lines
              </p>
            )}
          </TabsContent>

          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-3 flex gap-2">
            <Button onClick={handleImport} disabled={!csv.trim() || loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : "Import"}
            </Button>
            {csv && <Button variant="ghost" size="sm" onClick={() => setCsv("")}>Clear</Button>}
          </div>
        </Tabs>
      )}
    </div>
  );
}

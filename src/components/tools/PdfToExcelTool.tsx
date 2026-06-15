
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {  FileDrop, ProgressBar, RunButton , DetailedPreview } from "@/components/pdfui";
import { Banner } from "@/components/ui";
import { baseName, downloadBlob, openPdfjsDoc } from "@/lib/pdf";

interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  pages: number;
}

export default function PdfToExcelTool() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ val: number; label: string } | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);

  const load = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setNote(null);
    try {
      const bytes = await file.arrayBuffer();
      const pj = await openPdfjsDoc(bytes);
      setDoc({ name: file.name, bytes, pages: pj.numPages });
      pj.destroy();
    } catch (e) {
      setNote({ kind: "err", msg: `Couldn't read PDF: ${(e as Error).message}` });
    }
  };

  const run = async () => {
    if (!doc) return;
    setBusy(true);
    setNote(null);
    setProgress({ val: 0, label: "Reading PDF structure..." });

    try {
      const pj = await openPdfjsDoc(doc.bytes);
      const workbook = XLSX.utils.book_new();
      let hasData = false;

      for (let i = 1; i <= doc.pages; i++) {
        setProgress({ val: i / doc.pages, label: `Processing page ${i}...` });
        const page = await pj.getPage(i);
        const textContent = await page.getTextContent();

        // Group items by Y coordinate to form rows
        const rowsMap = new Map<number, { text: string; x: number }[]>();



        for (const item of textContent.items) {
           if ('str' in item && item.str.trim()) {
              // Round Y to nearest 8 points to group items on same visual line more robustly
              const y = Math.round(item.transform[5] / 8) * 8;
              if (!rowsMap.has(y)) rowsMap.set(y, []);
              rowsMap.get(y)!.push({ text: item.str.trim(), x: item.transform[4] });
           }
        }

        if (rowsMap.size > 0) {
            hasData = true;
            // Sort rows descending (PDF coordinates usually have 0 at bottom)
            const sortedYs = Array.from(rowsMap.keys()).sort((a, b) => b - a);

            const sheetData: string[][] = [];
            for (const y of sortedYs) {
               // Sort columns left-to-right
               const rowItems = rowsMap.get(y)!.sort((a, b) => a.x - b.x);
               sheetData.push(rowItems.map(item => item.text));
            }

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${i}`);
        }

        page.cleanup();
      }

      pj.destroy();

      if (!hasData) {
        setNote({ kind: "warn", msg: "No tabular text could be extracted. It might be a scanned document." });
        setBusy(false);
        setProgress(null);
        return;
      }

      setProgress({ val: 1, label: "Writing Excel file..." });

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const stem = baseName(doc.name);
      downloadBlob(blob, `${stem}.xlsx`);

      setNote({ kind: "ok", msg: `Converted ${doc.pages} pages to Excel → ${stem}.xlsx` });
    } catch (e) {
      setNote({ kind: "err", msg: `Conversion failed: ${(e as Error).message}` });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  if (!doc) {
    return (
      <div className="stack" style={{ gap: "var(--s-5)" }}>
        <FileDrop
          accept="application/pdf"
          multiple={false}
          onFiles={load}
          icon="type"
          title={<>Drop a PDF or <span className="em">browse</span></>}
          sub="We'll approximate tables from text placement and export to Excel (.xlsx)."
        />
        {note && <Banner kind={note.kind === "err" ? "error" : "warn"}>{note.msg}</Banner>}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <div className="panel-title with-sub">{doc.name}</div>
        <div className="panel-sub">{doc.pages} pages to process</div>
        <p className="muted" style={{ marginTop: "var(--s-3)", fontSize: "var(--text-sm)" }}>
          Note: Since PDFs do not natively contain tables, this tool uses spacing algorithms to guess table rows and columns. Results may require manual cleanup.
        </p>
      </div>

      <div className="run-bar">
        <RunButton onClick={run} busy={busy} icon="type">
          Convert to Excel
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setDoc(null)} disabled={busy}>
          Choose another
        </button>
      </div>

      {progress && <ProgressBar value={progress.val} label={progress.label} />}

      {note && (
        <Banner kind={note.kind === "ok" ? "success" : note.kind === "warn" ? "warn" : "error"} title={note.kind === "ok" ? "Done" : undefined}>
          {note.msg}
        </Banner>
      )}
    </div>
  );
}

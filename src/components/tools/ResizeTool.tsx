"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Banner, Segmented } from "@/components/ui";
import { baseName, downloadBlob, parsePageRange } from "@/lib/pdf";

interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  pages: number;
}

const PRESETS = [
  { label: "A4", w: 595.28, h: 841.89 },
  { label: "Letter", w: 612, h: 792 },
  { label: "Legal", w: 612, h: 1008 },
];

export default function ResizeTool() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [target, setTarget] = useState<"all" | "range">("all");
  const [range, setRange] = useState("");
  const [width, setWidth] = useState(PRESETS[0].w);
  const [height, setHeight] = useState(PRESETS[0].h);
  const [scaleContent, setScaleContent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const load = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setNote(null);
    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setDoc({ name: file.name, bytes, pages: pdf.getPageCount() });
      setRange(`1-${pdf.getPageCount()}`);
    } catch (e) {
      setNote({ kind: "err", msg: `Couldn't read PDF: ${(e as Error).message}` });
    }
  };

  const run = async () => {
    if (!doc) return;
    setBusy(true);
    setNote(null);
    try {
      const pdf = await PDFDocument.load(doc.bytes, { ignoreEncryption: true });
      const indices = target === "all" ? pdf.getPageIndices() : parsePageRange(range, doc.pages);
      const pages = pdf.getPages();

      for (const idx of indices) {
        const page = pages[idx];
        const cb = page.getCropBox();
        const cw = cb.width;
        const ch = cb.height;

        if (scaleContent) {
           const scaleX = width / cw;
           const scaleY = height / ch;
           const scale = Math.min(scaleX, scaleY);

           page.scaleContent(scale, scale);

           // After scaling content, update the size
           page.setSize(width, height);
           // Center it
           const newWidth = cw * scale;
           const newHeight = ch * scale;
           page.translateContent((width - newWidth) / 2, (height - newHeight) / 2);

        } else {
           page.setSize(width, height);
        }
      }

      const out = await pdf.save();
      const stem = baseName(doc.name);
      downloadBlob(out, `${stem}-resized.pdf`);
      setNote({ kind: "ok", msg: `Resized ${indices.length} page${indices.length === 1 ? "" : "s"} → ${stem}-resized.pdf` });
    } catch (e) {
      setNote({ kind: "err", msg: `Resize failed: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  if (!doc) {
    return (
      <FileDrop
        accept="application/pdf"
        multiple={false}
        onFiles={load}
        icon="crop" // Reuse crop icon
        title={<>Drop a PDF or <span className="em">browse</span></>}
        sub="Resize pages and optionally scale their contents."
      />
    );
  }

  const numField = (label: string, val: number, set: (n: number) => void) => (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <input className="input" type="number" min={1} value={val} onChange={(e) => set(Number(e.target.value))} />
    </div>
  );

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <div className="panel-title with-sub">{doc.name}</div>
        <div className="panel-sub">{doc.pages} pages</div>

        <div className="field" style={{ marginTop: "var(--s-4)" }}>
           <label>Presets</label>
           <div style={{ display: "flex", gap: "var(--s-3)" }}>
             {PRESETS.map((p) => (
               <button
                  key={p.label}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setWidth(p.w); setHeight(p.h); }}
               >
                 {p.label}
               </button>
             ))}
           </div>
        </div>

        <div className="field-row" style={{ marginTop: "var(--s-4)" }}>
          {numField("Width (pt)", Math.round(width), setWidth)}
          {numField("Height (pt)", Math.round(height), setHeight)}
        </div>

        <div className="field" style={{ marginTop: "var(--s-5)", marginBottom: 0 }}>
           <label className="check">
            <input type="checkbox" checked={scaleContent} onChange={(e) => setScaleContent(e.target.checked)} />
            <span className="box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12.5 10 17.5 19 6.5"/></svg>
            </span>
            <span className="ctext">Scale content to fit new size</span>
          </label>
        </div>

        <div className="field" style={{ marginTop: "var(--s-5)", marginBottom: 0 }}>
          <label>Apply to</label>
          <Segmented
            value={target}
            onChange={setTarget}
            options={[
              { value: "all", label: "All pages" },
              { value: "range", label: "Range" },
            ]}
          />
          {target === "range" && (
            <input className="input mono" style={{ marginTop: 8 }} value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. 1-3" />
          )}
        </div>
      </div>

      <div className="run-bar">
        <RunButton onClick={run} busy={busy} icon="crop">
          Resize &amp; download
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setDoc(null)} disabled={busy}>
          Choose another
        </button>
      </div>

      {note && (
        <Banner kind={note.kind === "ok" ? "success" : "error"} title={note.kind === "ok" ? "Done" : "Couldn't resize"}>
          {note.msg}
        </Banner>
      )}
    </div>
  );
}

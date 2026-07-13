
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { createWorker } from "tesseract.js";
import {  FileDrop, ProgressBar, RunButton , DetailedPreview } from "@/components/pdfui";
import { Banner } from "@/components/ui";
import { baseName, downloadBlob, openPdfjsDoc, renderPageToBlob } from "@/lib/pdf";

interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  pages: number;
}

export default function OcrTool() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ val: number; label: string } | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

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
    setProgress({ val: 0, label: "Loading OCR engine..." });

    try {
      const pj = await openPdfjsDoc(doc.bytes);
      let fullText = "";

      const worker = await createWorker("eng", 1, {
        logger: m => {
          if (m.status === "recognizing text") {
            // progress is within current page
          }
        }
      });

      for (let i = 1; i <= doc.pages; i++) {
        setProgress({ val: (i - 1) / doc.pages, label: `Rasterizing page ${i}...` });
        const { blob } = await renderPageToBlob(pj, i, { scale: 2.0, type: "image/png" });

        setProgress({ val: (i - 0.5) / doc.pages, label: `Running OCR on page ${i}...` });
        const ret = await worker.recognize(blob);
        fullText += `--- Page ${i} ---\n\n${ret.data.text}\n\n`;
      }

      await worker.terminate();
      pj.destroy();

      setProgress({ val: 1, label: "Done" });
      const stem = baseName(doc.name);
      downloadBlob(new Blob([fullText], { type: "text/plain" }), `${stem}-ocr.txt`);
      setNote({ kind: "ok", msg: `Extracted text from ${doc.pages} pages → ${stem}-ocr.txt` });
    } catch (e) {
      setNote({ kind: "err", msg: `OCR failed: ${(e as Error).message}` });
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
          title={<>Drop a scanned PDF or <span className="em">browse</span></>}
          sub="We'll run optical character recognition (OCR) and give you the text."
        />
        {note && <Banner kind="error">{note.msg}</Banner>}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <div className="panel-title with-sub">{doc.name}</div>
        <div className="panel-sub">{doc.pages} pages to process</div>
        <p className="muted" style={{ marginTop: "var(--s-3)", fontSize: "var(--text-sm)" }}>
          Note: OCR runs entirely in your browser using WebAssembly. This might take a few moments per page, but your document never leaves your device.
        </p>
      </div>

      <div className="run-bar">
        <RunButton onClick={run} busy={busy} icon="type">
          Run OCR &amp; download text
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setDoc(null)} disabled={busy}>
          Choose another
        </button>
      </div>

      {progress && <ProgressBar value={progress.val} label={progress.label} />}

      {note && (
        <Banner kind={note.kind === "ok" ? "success" : "error"} title={note.kind === "ok" ? "Done" : "Couldn't run OCR"}>
          {note.msg}
        </Banner>
      )}
    </div>
  );
}

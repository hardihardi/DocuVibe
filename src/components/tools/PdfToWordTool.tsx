"use client";

import { useState } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { FileDrop, ProgressBar, RunButton } from "@/components/pdfui";
import { Banner } from "@/components/ui";
import { baseName, downloadBlob, openPdfjsDoc } from "@/lib/pdf";

interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  pages: number;
}

export default function PdfToWordTool() {
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
    setProgress({ val: 0, label: "Reading PDF text..." });

    try {
      const pj = await openPdfjsDoc(doc.bytes);
      const paragraphs: Paragraph[] = [];
      let totalTextLength = 0;

      for (let i = 1; i <= doc.pages; i++) {
        setProgress({ val: i / doc.pages, label: `Extracting page ${i}...` });
        const page = await pj.getPage(i);
        const textContent = await page.getTextContent();

        let currentPageText = "";
        let lastY = -1;

        for (const item of textContent.items) {
          if ('str' in item) {
             // Heuristic to create new paragraphs based on Y coordinate jumps
             if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 12) {
                paragraphs.push(new Paragraph({ children: [new TextRun(currentPageText.trim())] }));
                totalTextLength += currentPageText.trim().length;
                currentPageText = "";
             }
             currentPageText += item.str + " ";
             lastY = item.transform[5];
          }
        }
        if (currentPageText.trim()) {
           paragraphs.push(new Paragraph({ children: [new TextRun(currentPageText.trim())] }));
           totalTextLength += currentPageText.trim().length;
        }

        // Add a page break if not the last page
        if (i < doc.pages) {
            paragraphs.push(new Paragraph({ pageBreakBefore: true }));
        }

        page.cleanup();
      }

      pj.destroy();

      if (totalTextLength === 0) {
        setNote({ kind: "warn", msg: "No selectable text was found in this PDF. It might be a scanned document. Try using OCR instead." });
        setBusy(false);
        setProgress(null);
        return;
      }

      setProgress({ val: 1, label: "Generating Word document..." });

      const wordDoc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
      });

      const blob = await Packer.toBlob(wordDoc);
      const stem = baseName(doc.name);
      downloadBlob(blob, `${stem}.docx`);

      setNote({ kind: "ok", msg: `Converted ${doc.pages} pages to Word → ${stem}.docx` });
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
          sub="We'll extract the text and convert it to a Word document (.docx)."
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
      </div>

      <div className="run-bar">
        <RunButton onClick={run} busy={busy} icon="type">
          Convert to Word
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

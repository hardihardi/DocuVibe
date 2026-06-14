"use client";

import { useState } from "react";
import JSZip from "jszip";
import { PDFDocument, rgb } from "pdf-lib";
import { FileDrop, RunButton } from "@/components/pdfui";
import { formatBytes } from "@/lib/pdf";
import { Banner } from "@/components/ui";


interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  size: number;
}
export default function PowerPointToPdfTool() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const load = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    f.arrayBuffer().then((bytes) => setDoc({ name: f.name, bytes, size: f.size }));
  };

  const handleProcess = async () => {
    if (!doc) return;

    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = doc.bytes;
      const zip = await JSZip.loadAsync(arrayBuffer);

      const pdfDoc = await PDFDocument.create();

      // Find slide files
      const slideFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'));

      if (slideFiles.length === 0) {
          throw new Error("No slides found or unsupported format.");
      }

      // Sort slides numerically
      slideFiles.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''));
          const numB = parseInt(b.replace(/\D/g, ''));
          return numA - numB;
      });

      for (const slidePath of slideFiles) {
          const xmlData = await zip.files[slidePath].async("string");

          // Very basic text extraction
          const textMatches = xmlData.match(/<a:t>([^<]*)<\/a:t>/g);
          const texts = textMatches ? textMatches.map(t => t.replace(/<a:t>/, '').replace(/<\/a:t>/, '')) : [];

          // Create a page for this slide
          const page = pdfDoc.addPage([800, 600]); // Typical 4:3 presentation ratio

          let yOffset = 550;
          for(const text of texts) {
              if (text.trim() === '') continue;
              page.drawText(text, {
                  x: 50,
                  y: yOffset,
                  size: 20,
                  color: rgb(0, 0, 0),
              });
              yOffset -= 30;
              if (yOffset < 50) {
                   break; // Avoid falling off the page
              }
          }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name.replace(/\.pptx?$/i, ".pdf");
      a.click();
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to convert PowerPoint to PDF."));
    } finally {
      setProcessing(false);
    }
  };


  if (!doc) {
    return (
      <FileDrop
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onFiles={load}
        multiple={false}
        icon="type"
        title={<>Drop a PowerPoint presentation or <span className="em">browse</span></>}
        sub="Extracts text to PDF."
      />
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <div className="panel-title with-sub">{doc.name}</div>
        <div className="panel-sub">{formatBytes(doc.size)} loaded</div>
      </div>

      <Banner kind="info" title="How this works">
        This is a basic conversion that extracts text from slides. Images and formatting will be lost.
      </Banner>

      <div className="run-bar">
        <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="type">
          {processing ? "Converting..." : "Convert to PDF"}
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setDoc(null)} disabled={processing}>
          Choose another
        </button>
      </div>

      {error && (
        <Banner kind="error" title="Couldn't convert">
          {error}
        </Banner>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";
import html2canvas from "html2canvas";
import { FileDrop, RunButton } from "@/components/pdfui";
import { formatBytes } from "@/lib/pdf";
import { Banner } from "@/components/ui";


interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  size: number;
}
export default function ExcelToPdfTool() {
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
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(worksheet);

      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "1000px";
      iframe.style.height = "1000px";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Could not create iframe document");

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; margin: 0; background: white; color: black; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
            <h2>${doc.name} - ${sheetName}</h2>
            ${html}
        </body>
        </html>
      `);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(iframeDoc.body, {
          scale: 2,
          windowWidth: 1000,
          windowHeight: iframeDoc.body.scrollHeight,
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([canvas.width, canvas.height]);
      const image = await pdfDoc.embedJpg(imgData);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name.replace(/\.(xlsx|csv|xls)$/i, ".pdf");
      a.click();
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to convert Excel/CSV to PDF."));
    } finally {
      setProcessing(false);
    }
  };


  if (!doc) {
    return (
      <FileDrop
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,text/csv,.xls,application/vnd.ms-excel"
        onFiles={load}
        multiple={false}
        icon="type"
        title={<>Drop an Excel or CSV file or <span className="em">browse</span></>}
        sub="Converts the first sheet to PDF."
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
        This tool extracts the first sheet from the Excel/CSV file and renders it to a PDF format. Complex formulas and formatting might not be fully preserved.
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

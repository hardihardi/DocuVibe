"use client";

import { useState, useRef } from "react";
import { RunButton } from "@/components/pdfui";
import { formatBytes } from "@/lib/pdf";
import { Banner, RangeField } from "@/components/ui";
import html2canvas from "html2canvas";


export default function HTMLToImageTool() {

  const [htmlString, setHtmlString] = useState("<h2>Hello World</h2><p>This is a test.</p>");
  const [padding, setPadding] = useState(16);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleProcess = async () => {
    if (!containerRef.current || !htmlString) return;
    setProcessing(true);
    setError(null);
    try {
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: bgColor === "transparent" ? null : bgColor,
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `html_snippet.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to convert HTML to image."));
    } finally {
      setProcessing(false);
    }
  };


  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <div className="panel-title">HTML to Image Settings</div>

        <div className="field-row">
            <div className="field">
                <label>Background Color</label>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <input type="color" className="input" style={{padding: '0', height: '38px', width: '60px'}} value={bgColor === "transparent" ? "#ffffff" : bgColor} onChange={e => setBgColor(e.target.value)} disabled={bgColor === "transparent"} />
                    <label className="check" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0}}>
                        <input type="checkbox" checked={bgColor === "transparent"} onChange={(e) => setBgColor(e.target.checked ? "transparent" : "#ffffff")} />
                        <span>Transparent</span>
                    </label>
                </div>
            </div>
            <div className="field">
                <label>Padding Wrapper (px)</label>
                <RangeField value={padding} min={0} max={100} onChange={setPadding} fmt={v => `${v}px`} />
            </div>
        </div>

        <div className="field">
            <label>HTML Snippet</label>
            <textarea
                className="textarea mono"
                rows={6}
                value={htmlString}
                onChange={e => setHtmlString(e.target.value)}
                placeholder="<h1>Title</h1>..."
            />
        </div>

        <div className="field">
            <label>Preview (This will be captured)</label>
            <div className="border rounded bg-white text-black overflow-auto relative max-w-full w-full checkerboard" style={{ padding: `${padding}px`, backgroundColor: bgColor === "transparent" ? undefined : bgColor }}>
                <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlString }} className="inline-block" />
            </div>
        </div>

      </div>

      <div className="run-bar">
        <RunButton onClick={handleProcess} disabled={processing || !htmlString} busy={processing} icon="img2pdf">
          {processing ? "Converting..." : "Convert to Image"}
        </RunButton>
      </div>

      {error && (
        <Banner kind="error" title="Couldn't convert">
          {error}
        </Banner>
      )}

      <style>{`
        .checkerboard {
            background-image:
              linear-gradient(45deg, #ccc 25%, transparent 25%),
              linear-gradient(-45deg, #ccc 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ccc 75%),
              linear-gradient(-45deg, transparent 75%, #ccc 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
}

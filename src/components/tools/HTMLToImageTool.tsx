"use client";

import { useState, useRef, useEffect } from "react";
import { RunButton } from "@/components/pdfui";
import { Banner, RangeField } from "@/components/ui";
import html2canvas from "html2canvas";

export default function HTMLToImageTool() {
  const [htmlString, setHtmlString] = useState(
    `<div style="padding: 20px; font-family: sans-serif;">
  <h1 style="color: #3b82f6;">Hello World! 🚀</h1>
  <p style="color: #4b5563; font-size: 18px;">
    This is a detailed <strong>HTML to Image</strong> tool.
    You can use inline CSS to style your components.
  </p>
  <ul style="color: #1f2937;">
    <li>Transparent Background Support</li>
    <li>High Quality Export (2x Scale)</li>
    <li>Responsive Editor Layout</li>
  </ul>
</div>`
  );

  const [padding, setPadding] = useState(24);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#000000"); // Tambahan fitur warna teks default
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
      if (!blob) throw new Error("Canvas is empty");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `html_export_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to convert HTML to image.");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlString);
    alert("HTML Copied!");
  };

  const clearEditor = () => {
    if (confirm("Clear all code?")) setHtmlString("");
  };

  return (
    <div className="stack" style={{ gap: "var(--s-5)", maxWidth: "1200px", margin: "0 auto" }}>
      <div className="panel">
        <div className="panel-title">Visual Settings</div>

        <div className="field-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          {/* Background Setting */}
          <div className="field">
            <label>Background Appearance</label>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="color"
                className="input"
                style={{ padding: "0", height: "40px", width: "60px", cursor: "pointer" }}
                value={bgColor === "transparent" ? "#ffffff" : bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                disabled={bgColor === "transparent"}
              />
              <label className="check" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "18px", height: "18px" }}
                  checked={bgColor === "transparent"}
                  onChange={(e) => setBgColor(e.target.checked ? "transparent" : "#ffffff")}
                />
                <span style={{ fontWeight: 500 }}>Transparent</span>
              </label>
            </div>
          </div>

          {/* Text Color Setting */}
          <div className="field">
            <label>Default Text Color</label>
            <input
              type="color"
              className="input"
              style={{ padding: "0", height: "40px", width: "60px", cursor: "pointer" }}
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
            />
          </div>

          {/* Padding Setting */}
          <div className="field">
            <label>Canvas Padding ({padding}px)</label>
            <RangeField value={padding} min={0} max={120} onChange={setPadding} fmt={(v) => `${v}px`} />
          </div>
        </div>
      </div>

      {/* Editor & Preview Split View */}
      <div className="editor-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
        
        {/* HTML EDITOR SECTION */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>HTML Editor</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={copyToClipboard} className="btn-small">Copy</button>
              <button onClick={clearEditor} className="btn-small variant-danger">Clear</button>
            </div>
          </div>
          <div className="code-container" style={{ position: "relative", flexGrow: 1 }}>
            <textarea
              className="textarea mono code-editor"
              spellCheck="false"
              value={htmlString}
              onChange={(e) => setHtmlString(e.target.value)}
              placeholder="Enter your HTML here..."
              style={{
                width: "100%",
                minHeight: "350px",
                padding: "15px",
                fontSize: "14px",
                lineHeight: "1.5",
                backgroundColor: "#1e1e1e",
                color: "#d4d4d4",
                borderRadius: "8px",
                border: "1px solid #333",
                fontFamily: "'Fira Code', monospace",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* PREVIEW SECTION */}
        <div className="panel">
          <div className="panel-title">Live Preview</div>
          <div 
            className={`preview-wrapper border rounded relative max-w-full overflow-hidden ${bgColor === "transparent" ? "checkerboard" : ""}`}
            style={{ 
              backgroundColor: bgColor === "transparent" ? "#f0f0f0" : "#eee",
              minHeight: "350px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {/* Area yang akan dicapture */}
            <div 
              ref={containerRef}
              style={{ 
                padding: `${padding}px`, 
                backgroundColor: bgColor === "transparent" ? "transparent" : bgColor,
                color: textColor,
                transition: "all 0.2s ease"
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: htmlString || "<p>Nothing to preview</p>" }} className="inline-block" />
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "10px", textAlign: "center" }}>
            * This preview matches the final exported PNG size and style.
          </p>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="run-bar" style={{ marginTop: "20px" }}>
        <RunButton onClick={handleProcess} disabled={processing || !htmlString} busy={processing} icon="img2pdf">
          {processing ? "Generating Image..." : "Download as PNG Image"}
        </RunButton>
      </div>

      {error && (
        <Banner kind="error" title="Conversion Failed">
          {error}
        </Banner>
      )}

      <style>{`
        .code-editor:focus {
            outline: none;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .btn-small {
            padding: 4px 10px;
            font-size: 12px;
            border-radius: 4px;
            cursor: pointer;
            border: 1px solid #ccc;
            background: #fff;
        }
        .variant-danger {
            color: #dc2626;
            border-color: #fee2e2;
        }
        .checkerboard {
            background-image:
              linear-gradient(45deg, #ddd 25%, transparent 25%),
              linear-gradient(-45deg, #ddd 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ddd 75%),
              linear-gradient(-45deg, transparent 75%, #ddd 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            background-color: #fff;
        }
        .preview-wrapper {
            box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
            border: 1px solid #ddd;
        }
        @media (max-width: 768px) {
            .field-row { grid-template-columns: 1fr !important; }
            .editor-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

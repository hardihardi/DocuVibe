/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { FileDrop, ProgressBar, RunButton } from "@/components/pdfui";
import { Banner, Icon, Modal, RangeField, cx } from "@/components/ui";
import { baseName, downloadBlob, hexToRgb, openPdfjsDoc, renderPageToBlob } from "@/lib/pdf";

interface RPage {
  url: string;
  ptW: number;
  ptH: number;
}
type AnnType = "text" | "date" | "sig";
interface Ann {
  id: string;
  page: number;
  type: AnnType;
  xFrac: number;
  yFrac: number;
  text?: string;
  fsFrac?: number;
  color?: string;
  img?: string;
  wFrac?: number;
  aspect?: number;
}

const uid = () => Math.random().toString(36).slice(2);

export default function FillSignTool() {
  const [name, setName] = useState("");
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<RPage[]>([]);
  const [cur, setCur] = useState(0);
  const [anns, setAnns] = useState<Ann[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [padOpen, setPadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"signature" | "stamp" | "text">("signature");
  const [note, setNote] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const pageBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<null | {
    id: string;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    w: number;
    h: number;
    mode: "move" | "resize";
  }>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, kind: "sig" | "stamp") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setAnns((p) => [
        ...p,
        {
          id: uid(),
          page: cur,
          type: "sig",
          img: url,
          aspect: img.width / img.height,
          wFrac: kind === "stamp" ? 0.20 : 0.3,
          xFrac: 0.1,
          yFrac: 0.1,
        },
      ]);
    };
    img.src = url;
    e.target.value = "";
  };

  const load = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setNote(null);
    setLoading(true);
    setProgress(0);
    try {
      const buf = await file.arrayBuffer();
      const doc = await openPdfjsDoc(buf);
      const total = doc.numPages;
      const out: RPage[] = [];
      for (let i = 1; i <= total; i++) {
        const r = await renderPageToBlob(doc, i, { scale: 1.5, type: "image/jpeg", quality: 0.8 });
        out.push({ url: URL.createObjectURL(r.blob), ptW: r.width / 1.5, ptH: r.height / 1.5 });
        setProgress(i / total);
      }
      doc.destroy();
      setName(file.name);
      setBytes(buf);
      setPages(out);
      setCur(0);
      setAnns([]);
    } catch (e) {
      setNote({ kind: "err", msg: `Load failed: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]);
    setBytes(null);
    setAnns([]);
    setSelected(null);
    setName("");
  };

  const update = useCallback((id: string, patch: Partial<Ann>) => {
    setAnns((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const removeAnn = (id: string) => {
    setAnns((p) => p.filter((a) => a.id !== id));
    setSelected(null);
  };

  const addText = (value: string, type: AnnType = "text") => {
    const a: Ann = { id: uid(), page: cur, type, xFrac: 0.1, yFrac: 0.1, text: value, fsFrac: 0.025, color: "#000000" };
    setAnns((p) => [...p, a]);
    setSelected(a.id);
  };

  const addSignature = (img: string, aspect: number) => {
    const a: Ann = { id: uid(), page: cur, type: "sig", xFrac: 0.1, yFrac: 0.1, img, aspect, wFrac: 0.3 };
    setAnns((p) => [...p, a]);
    setSelected(a.id);
  };

  // Pointer Handlers (Move/Resize)
  const onPointerDown = (e: RPointerEvent, ann: Ann, mode: "move" | "resize") => {
    if (editing === ann.id) return;
    e.preventDefault();
    const box = pageBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    dragRef.current = {
      id: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: mode === "resize" ? (ann.wFrac ?? 0.3) : ann.xFrac,
      oy: ann.yFrac,
      w: rect.width,
      h: rect.height,
      mode,
    };
    setSelected(ann.id);
  };

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (d.mode === "move") {
        update(d.id, { 
          xFrac: Math.max(0, Math.min(0.9, d.ox + (clientX - d.startX) / d.w)),
          yFrac: Math.max(0, Math.min(0.9, d.oy + (clientY - d.startY) / d.h))
        });
      } else {
        update(d.id, { wFrac: Math.max(0.05, Math.min(0.8, d.ox + (clientX - d.startX) / d.w)) });
      }
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [update]);

  const run = async () => {
    if (!bytes) return;
    setBusy(true);
    try {
      const pdf = await PDFDocument.load(bytes);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const docPages = pdf.getPages();
      for (const a of anns) {
        const page = docPages[a.page];
        const { width: ptW, height: ptH } = page.getSize();
        if ((a.type === "text" || a.type === "date") && a.text) {
          const size = (a.fsFrac ?? 0.025) * ptH;
          const { r, g, b } = hexToRgb(a.color ?? "#000000");
          page.drawText(a.text, { x: a.xFrac * ptW, y: ptH - (a.yFrac * ptH) - size, size, font, color: rgb(r/255, g/255, b/255) });
        } else if (a.type === "sig" && a.img) {
          const imgBytes = await fetch(a.img).then(res => res.arrayBuffer());
          const png = await pdf.embedPng(imgBytes);
          const w = (a.wFrac ?? 0.3) * ptW;
          const h = w / (a.aspect ?? 1);
          page.drawImage(png, { x: a.xFrac * ptW, y: ptH - (a.yFrac * ptH) - h, width: w, height: h });
        }
      }
      const res = await pdf.save();
      downloadBlob(res, `${baseName(name)}-signed.pdf`);
    } catch (e) {
      setNote({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (pages.length === 0) {
    return (
      <div className="stack">
        <FileDrop 
          accept="application/pdf" 
          onFiles={load} 
          title={loading ? "Processing..." : "Fill & Sign PDF"} 
          sub="Add your signature, stamps, or text to any page"
        />
        {loading && <ProgressBar value={progress} />}
      </div>
    );
  }

  return (
    <div className="editor-shell">
      {/* Mobile Tabs Navigation */}
      <div className="mobile-tabs-nav show-mobile">
        <button className={cx("tab-item", activeTab === "signature" && "active")} onClick={() => setActiveTab("signature")}>Signature</button>
        <button className={cx("tab-item", activeTab === "stamp" && "active")} onClick={() => setActiveTab("stamp")}>Stamp</button>
        <button className={cx("tab-item", activeTab === "text" && "active")} onClick={() => setActiveTab("text")}>Text</button>
      </div>

      <div className="editor-toolbar flex-responsive">
        
        {/* Signature Group */}
        {(activeTab === "signature" || window.innerWidth > 768) && (
          <div className="toolbar-group">
            <div className="toolbar-label">Signature</div>
            <div className="toolbar-actions">
              <button className="tool-pill" onClick={() => setPadOpen(true)}>
                <Icon name="edit" size={14} /> Draw
              </button>
              <label className="tool-pill pointer">
                <Icon name="upload" size={14} /> Upload
                <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, "sig")} />
              </label>
            </div>
          </div>
        )}

        <span className="sep hide-mobile" />

        {/* Stamp Group */}
        {(activeTab === "stamp" || window.innerWidth > 768) && (
          <div className="toolbar-group">
            <div className="toolbar-label">Stamp & Seal</div>
            <div className="toolbar-actions">
              <label className="tool-pill pointer">
                <Icon name="plus" size={14} /> Add Stamp
                <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, "stamp")} />
              </label>
            </div>
          </div>
        )}

        <span className="sep hide-mobile" />

        {/* Text/Date Group */}
        {(activeTab === "text" || window.innerWidth > 768) && (
          <div className="toolbar-group">
            <div className="toolbar-label">Content</div>
            <div className="toolbar-actions">
              <button className="tool-pill" onClick={() => addText("New Text", "text")}>
                <Icon name="type" size={14} /> Text
              </button>
              <button className="tool-pill" onClick={() => addText(new Date().toLocaleDateString(), "date")}>
                <Icon name="calendar" size={14} /> Date
              </button>
            </div>
          </div>
        )}

        {/* Format controls for text */}
        {selected && anns.find(a => a.id === selected)?.type !== 'sig' && (
           <div className="toolbar-group">
             <div className="toolbar-label">Format</div>
             <div className="toolbar-actions">
                <input type="color" className="color-swatch" onChange={(e) => update(selected, { color: e.target.value })} />
             </div>
           </div>
        )}

        <div className="pager-fixed">
          <button className="icon-btn" onClick={() => setCur(p => Math.max(0, p-1))} disabled={cur===0}><Icon name="chevronLeft" /></button>
          <span className="mono">{cur + 1} / {pages.length}</span>
          <button className="icon-btn" onClick={() => setCur(p => Math.min(pages.length-1, p+1))} disabled={cur===pages.length-1}><Icon name="chevronRight" /></button>
        </div>
      </div>

      <div className="canvas-stage">
        <div 
          className="page-canvas" 
          ref={pageBoxRef}
          style={{ 
            aspectRatio: `${pages[cur].ptW}/${pages[cur].ptH}`, 
            maxWidth: '100%', 
            width: pages[cur].ptW,
            position: 'relative'
          } as CSSProperties}
        >
          <img src={pages[cur].url} draggable={false} alt="pdf page" className="page-img" />
          
          {anns.filter(a => a.page === cur).map(a => {
            const isSel = a.id === selected;
            return (
              <div 
                key={a.id} 
                className={cx("annot", isSel && "selected")}
                style={{ left: `${a.xFrac * 100}%`, top: `${a.yFrac * 100}%`, position: 'absolute' }}
                onPointerDown={(e) => onPointerDown(e, a, "move")}
              >
                {a.type === 'sig' ? (
                  <div style={{ position: 'relative' }}>
                    <img src={a.img} alt="sig" style={{ width: `${(a.wFrac || 0.3) * 100}%`, height: 'auto', display: 'block' }} />
                    {isSel && <div className="resizer" onPointerDown={(e) => onPointerDown(e, a, "resize")} />}
                  </div>
                ) : (
                  <div 
                    contentEditable 
                    suppressContentEditableWarning
                    style={{ fontSize: `calc(${(a.fsFrac || 0.025) * 100} * 1cqw)`, color: a.color }}
                    onBlur={(e) => update(a.id, { text: e.currentTarget.innerText })}
                  >
                    {a.text}
                  </div>
                )}
                {isSel && <button className="del-btn" onClick={() => removeAnn(a.id)}><Icon name="x" size={10} /></button>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="run-bar-sticky">
        <RunButton onClick={run} busy={busy}>Apply & Download</RunButton>
        <button className="btn-ghost" onClick={reset}>Upload New PDF</button>
      </div>

      {padOpen && (
        <SignaturePad 
          onCancel={() => setPadOpen(false)} 
          onSave={(img, aspect) => { addSignature(img, aspect); setPadOpen(false); }} 
        />
      )}

      <style jsx>{`
        .flex-responsive { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
        .toolbar-group { display: flex; flex-direction: column; gap: 4px; }
        .toolbar-label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: 600; }
        .toolbar-actions { display: flex; gap: 8px; align-items: center; }
        .tool-pill { 
          display: flex; align-items: center; gap: 6px; padding: 6px 12px; 
          background: #f0f0f0; border-radius: 6px; font-size: 13px; border: none; cursor: pointer;
        }
        .tool-pill:hover { background: #e2e2e2; }
        .mobile-tabs-nav { display: none; border-bottom: 1px solid #eee; padding: 8px; gap: 4px; }
        .tab-item { flex: 1; padding: 8px; border: none; background: none; font-size: 12px; border-radius: 4px; }
        .tab-item.active { background: #000; color: #fff; }
        .pager-fixed { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        
        @media (max-width: 768px) {
          .mobile-tabs-nav { display: flex; }
          .hide-mobile { display: none; }
          .editor-toolbar { padding: 12px; justify-content: center; }
          .pager-fixed { width: 100%; justify-content: center; margin-top: 8px; }
        }
      `}</style>
    </div>
  );
}

/* --- Signature Pad Component --- */
function SignaturePad({ onSave, onCancel }: { onSave: (img: string, aspect: number) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasInk, setHasInk] = useState(false);
  const drawing = useRef(false);

  const start = (e: RPointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const r = canvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
    setHasInk(true);
  };

  const move = (e: RPointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const r = canvasRef.current!.getBoundingClientRect();
    ctx?.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx?.stroke();
  };

  const save = () => {
    const c = canvasRef.current;
    if (c) onSave(c.toDataURL(), c.width / c.height);
  };

  return (
    <Modal title="Draw Signature" onClose={onCancel} foot={
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={!hasInk}>Use Signature</button>
      </div>
    }>
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={200} 
        onPointerDown={start} 
        onPointerMove={move} 
        onPointerUp={() => drawing.current = false}
        style={{ border: '1px dashed #ccc', width: '100%', touchAction: 'none' }}
      />
    </Modal>
  );
}

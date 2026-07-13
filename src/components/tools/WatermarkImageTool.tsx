/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect } from "react";
import {  FileDrop, RunButton , DetailedPreview } from "@/components/pdfui";
import { RangeField, Segmented } from "@/components/ui";

export default function WatermarkImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [text, setText] = useState("DocuVibe");
  const [opacity, setOpacity] = useState(50);
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#ffffff");
  const [position, setPosition] = useState("center");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  }, [file]);

  const handleProcess = async () => {
    if (!imgRef.current || !file) return;
    setProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      ctx.drawImage(image, 0, 0);


      ctx.globalAlpha = opacity / 100;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      let x = canvas.width / 2;
      let y = canvas.height / 2;

      const padding = Math.max(canvas.width, canvas.height) * 0.05;

      if (position.includes("top")) y = padding + fontSize / 2;
      if (position.includes("bottom")) y = canvas.height - padding - fontSize / 2;

      if (position.includes("left")) {
          ctx.textAlign = 'left';
          x = padding;
      }
      if (position.includes("right")) {
          ctx.textAlign = 'right';
          x = canvas.width - padding;
      }

      ctx.translate(x, y);

      // Only rotate if center
      if (position === "center") {
          ctx.rotate(-Math.PI / 4);
      }

      ctx.fillText(text, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermarked_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />
      {imgSrc && (
        <div className="panel">
          <div className="relative overflow-hidden w-full flex justify-center" style={{ maxHeight: '400px' }}>
            <img ref={imgRef} src={imgSrc} alt="Preview" style={{ maxHeight: '400px', maxWidth: '100%', objectFit: 'contain' }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: opacity / 100 }}>
              <span className="text-white font-bold whitespace-nowrap" style={{ fontSize: `${fontSize/2}px`, transform: 'rotate(-45deg)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{text}</span>
            </div>
          </div>


          <div className="flex flex-col gap-4 w-full max-w-sm mt-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Watermark Text</label>
              <input type="text" className="border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700 w-full" value={text} onChange={e => setText(e.target.value)} />
            </div>

            <div className="flex gap-4 w-full">
                <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium">Color</label>
                <input type="color" className="h-10 w-full rounded cursor-pointer" value={color} onChange={e => setColor(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium">Position</label>
                <select className="border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700 w-full h-10" value={position} onChange={e => setPosition(e.target.value)}>
                    <option value="top-left">Top Left</option>
                    <option value="top">Top Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="center">Center (Diagonal)</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                </select>
                </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Opacity</label>
              <RangeField value={opacity} min={10} max={100} onChange={setOpacity} fmt={v => `${v}%`} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Font Size</label>
              <RangeField value={fontSize} min={16} max={200} onChange={setFontSize} fmt={v => `${v}px`} />
            </div>
          </div>
<RunButton onClick={handleProcess} disabled={processing || !text} busy={processing} icon="watermark">
            {processing ? "Applying..." : "Add Watermark"}
          </RunButton>
        </div>
      )}
    </div>
  );
}

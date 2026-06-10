"use client";

import { useState, useRef, useEffect } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";

export default function ResizeImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  }, [file]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    setWidth(w);
    setHeight(h);
    setAspectRatio(w / h);
  };

  const handleWidthChange = (val: string) => {
    const w = parseInt(val) || 0;
    setWidth(w);
    if (maintainAspect && w > 0) setHeight(Math.round(w / aspectRatio));
  };

  const handleHeightChange = (val: string) => {
    const h = parseInt(val) || 0;
    setHeight(h);
    if (maintainAspect && h > 0) setWidth(Math.round(h * aspectRatio));
  };

  const handleProcess = async () => {
    if (!imgRef.current || !file || width <= 0 || height <= 0) return;
    setProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resized_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-container flex flex-col gap-6">
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />
      {imgSrc && (
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded shadow">
          <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Original" style={{ maxHeight: '300px', objectFit: 'contain' }} />

          <div className="flex gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Width (px)</label>
              <input type="number" className="border p-2 rounded w-24 dark:bg-zinc-800 dark:border-zinc-700" value={width} onChange={e => handleWidthChange(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Height (px)</label>
              <input type="number" className="border p-2 rounded w-24 dark:bg-zinc-800 dark:border-zinc-700" value={height} onChange={e => handleHeightChange(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="aspect" checked={maintainAspect} onChange={e => setMaintainAspect(e.target.checked)} />
              <label htmlFor="aspect" className="text-sm">Maintain aspect ratio</label>
            </div>
          </div>

          <RunButton onClick={handleProcess} disabled={processing || width <=0 || height <=0} busy={processing} icon="crop">
            {processing ? "Resizing..." : "Resize Image"}
          </RunButton>
        </div>
      )}
    </div>
  );
}

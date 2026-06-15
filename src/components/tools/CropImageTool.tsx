/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect } from "react";
import {  FileDrop, RunButton , DetailedPreview } from "@/components/pdfui";
import { Banner, Segmented } from "@/components/ui";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export default function CropImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [aspect, setAspect] = useState<number | undefined>(1);
  const [aspectStr, setAspectStr] = useState<string>("1");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  }, [file]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect || 1));
  }

  const handleProcess = async () => {
    if (!completedCrop || !imgRef.current || !file) return;
    setProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio;

      canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.drawImage(
        image,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cropped_${file.name}`;
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

          <div className="w-full flex flex-col gap-2 mb-4 max-w-sm mx-auto">
            <label className="text-sm font-medium">Aspect Ratio</label>
            <Segmented
              value={aspectStr}
              onChange={(val) => {
                setAspectStr(val);
                const newAspect = val === "free" ? undefined : parseFloat(val);
                setAspect(newAspect);
                if (imgRef.current && newAspect) {
                    setCrop(centerAspectCrop(imgRef.current.width, imgRef.current.height, newAspect));
                }
              }}
              options={[
                { value: "free", label: "Free" },
                { value: "1", label: "1:1" },
                { value: "1.333", label: "4:3" },
                { value: "1.777", label: "16:9" },
              ]}
              block
            />
          </div>
          <div className="overflow-auto w-full flex justify-center">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >

            <img
              ref={imgRef}
              alt="Crop me"
              src={imgSrc}
              onLoad={onImageLoad}
              style={{ maxHeight: '60vh', maxWidth: '100%', objectFit: 'contain' }} className="mx-auto"
            />
          </ReactCrop>
          </div>
          <RunButton onClick={handleProcess} disabled={processing || !completedCrop} busy={processing} icon="crop">
            {processing ? "Cropping..." : "Crop Image"}
          </RunButton>
        </div>
      )}
    </div>
  );
}

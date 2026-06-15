"use client";

import { useState, useRef, useEffect } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Segmented } from "@/components/ui";

export default function RotateImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [rotation, setRotation] = useState<string>("0");
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener("load") , () => setImgSrc(reader.result?.toString() || "");
      reader.readAsDataURL(file);
      setRotation("0"); // Reset rotation saat ganti file
    }
  }, [file]);

  const handleProcess = async () => {
    if (!imgRef.current || !file) return;
    setProcessing(true);

    try {
      const image = imgRef.current;
      const angle = parseInt(rotation);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");

      const radians = (Math.PI / 180) * angle;
      const sin = Math.sin(radians);
      const cos = Math.cos(radians);
      
      // Hitung dimensi canvas baru berdasarkan rotasi
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      canvas.width = Math.abs(w * cos) + Math.abs(h * sin);
      canvas.height = Math.abs(w * sin) + Math.abs(h * cos);

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(image, -w / 2, -h / 2);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, file.type)
      );
      if (!blob) throw new Error("Canvas is empty");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rotated_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />

      {imgSrc && (
        <div className="bg-white border rounded-xl p-4 md:p-8 shadow-sm">
          {/* Preview Container: Menggunakan aspect-square atau min-height agar stabil di mobile */}
          <div className="relative w-full bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] md:min-h-[450px]">
            <div
              style={{
                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              className="flex justify-center items-center w-full h-full"
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Preview"
                className="max-w-[80%] max-h-[280px] md:max-h-[400px] object-contain shadow-md"
              />
            </div>
          </div>

          {/* Control Panel */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Rotate Angle
                </label>
                <div className="w-full overflow-x-auto pb-2">
                    {/* Pastikan Segmented component bisa menangani width full atau scroll di mobile */}
                    <Segmented
                      value={rotation}
                      onChange={setRotation}
                      options={[
                        { value: "0", label: "0°" },
                        { value: "90", label: "90° R" },
                        { value: "180", label: "180°" },
                        { value: "270", label: "90° L" },
                      ]}
                      block
                    />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Flip Image
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={flipH}
                      onChange={(e) => setFlipH(e.target.checked)}
                    />
                    <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">Horizontal</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={flipV}
                      onChange={(e) => setFlipV(e.target.checked)}
                    />
                    <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">Vertical</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <RunButton
                onClick={handleProcess}
                disabled={processing}
                busy={processing}
                icon="rotate"
                className="w-full"
              >
                {processing ? "Processing..." : "Download Rotated Image"}
              </RunButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

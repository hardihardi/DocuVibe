import type { ComponentType } from "react";
import MergeTool from "@/components/tools/MergeTool";
import SplitTool from "@/components/tools/SplitTool";
import OrganizeTool from "@/components/tools/OrganizeTool";
import RotateTool from "@/components/tools/RotateTool";
import PdfToImageTool from "@/components/tools/PdfToImageTool";
import ImageToPdfTool from "@/components/tools/ImageToPdfTool";
import PageNumbersTool from "@/components/tools/PageNumbersTool";
import WatermarkTool from "@/components/tools/WatermarkTool";
import FillSignTool from "@/components/tools/FillSignTool";
import FormFillTool from "@/components/tools/FormFillTool";
import CropTool from "@/components/tools/CropTool";
import ResizeTool from "@/components/tools/ResizeTool";
import CompressTool from "@/components/tools/CompressTool";
import PdfToExcelTool from "@/components/tools/PdfToExcelTool";
import PdfToWordTool from "@/components/tools/PdfToWordTool";
import OcrTool from "@/components/tools/OcrTool";
import ImageCompressTool from "@/components/tools/ImageCompressTool";
import ImageConvertTool from "@/components/tools/ImageConvertTool";
import VideoCompressTool from "@/components/tools/VideoCompressTool";
import PDFToHTMLTool from "@/components/tools/PDFToHTMLTool";
import CropImageTool from "@/components/tools/CropImageTool";
import RemoveBackgroundTool from "@/components/tools/RemoveBackgroundTool";
import ResizeImageTool from "@/components/tools/ResizeImageTool";
import HTMLToImageTool from "@/components/tools/HTMLToImageTool";
import WatermarkImageTool from "@/components/tools/WatermarkImageTool";
import RotateImageTool from "@/components/tools/RotateImageTool";
import BlurFaceTool from "@/components/tools/BlurFaceTool";

import CompressWordTool from "@/components/tools/CompressWordTool";
import CompressExcelTool from "@/components/tools/CompressExcelTool";
import CompressPowerPointTool from "@/components/tools/CompressPowerPointTool";
import WordToPdfTool from "@/components/tools/WordToPdfTool";
import ExcelToPdfTool from "@/components/tools/ExcelToPdfTool";
import PowerPointToPdfTool from "@/components/tools/PowerPointToPdfTool";



export type Category = "Organize" | "Convert" | "Edit & Sign" | "Optimize" | "Advanced" | "Media";

export interface Tool {
  id: string;
  name: string;
  /** Short card/blurb line. */
  description: string;
  /** Friendly tagline shown in the tool header. */
  tagline: string;
  category: Category;
  /** Icon name from the design icon set. */
  icon: string;
  Component: ComponentType;
}

export const CATEGORIES: Category[] = ["Organize", "Convert", "Edit & Sign", "Optimize", "Advanced", "Media"];

export const TOOLS: Tool[] = [
  // Organize
  { id: "merge", name: "Merge PDF", description: "Combine multiple PDFs into one tidy document.", tagline: "Drop your PDFs, drag to reorder, and merge.", category: "Organize", icon: "merge", Component: MergeTool },
  { id: "split", name: "Split PDF", description: "Separate one PDF into several files or ranges.", tagline: "Choose how you'd like to break it apart.", category: "Organize", icon: "split", Component: SplitTool },
  { id: "organize", name: "Organize Pages", description: "Reorder, rotate, and delete pages visually.", tagline: "Rearrange, rotate, or remove any page.", category: "Organize", icon: "organize", Component: OrganizeTool },
  { id: "rotate", name: "Rotate PDF", description: "Turn pages to the right orientation.", tagline: "Rotate all pages or just a range.", category: "Organize", icon: "rotate", Component: RotateTool },
  // Convert
  { id: "pdf-to-jpg", name: "PDF → Image", description: "Export each page as a PNG or JPG.", tagline: "Pick a format and quality — we'll do the rest.", category: "Convert", icon: "pdf2img", Component: PdfToImageTool },
  { id: "jpg-to-pdf", name: "Image → PDF", description: "Turn photos and scans into a PDF.", tagline: "Combine images into one PDF, in order.", category: "Convert", icon: "img2pdf", Component: ImageToPdfTool },
  // Edit & Sign
  { id: "fill-sign", name: "Fill & Sign", description: "Add text, dates, and your signature.", tagline: "Place text and your signature, then save.", category: "Edit & Sign", icon: "sign", Component: FillSignTool },
  { id: "watermark", name: "Watermark", description: "Stamp text or a logo across pages.", tagline: "Overlay text or an image on every page.", category: "Edit & Sign", icon: "watermark", Component: WatermarkTool },
  { id: "page-numbers", name: "Page Numbers", description: "Add page numbers in any position.", tagline: "Stamp page numbers in any corner.", category: "Edit & Sign", icon: "numbers", Component: PageNumbersTool },
  { id: "crop", name: "Crop PDF", description: "Trim margins and tidy up the frame.", tagline: "Trim margins with a live preview.", category: "Edit & Sign", icon: "crop", Component: CropTool },
  { id: "resize", name: "Resize PDF", description: "Change page dimensions and scale content.", tagline: "Resize pages and scale their contents to fit.", category: "Edit & Sign", icon: "crop", Component: ResizeTool },
  { id: "fill-forms", name: "Fill Forms", description: "Fill native AcroForm form fields.", tagline: "We detected the form fields — just type.", category: "Edit & Sign", icon: "forms", Component: FormFillTool },
  // Optimize
  { id: "compress", name: "Compress PDF", description: "Shrink file size while keeping it crisp.", tagline: "We'll find the sweet spot between size and quality.", category: "Optimize", icon: "compress", Component: CompressTool },

  { id: "compress-word", name: "Compress Word", description: "Reduce Word document file size.", tagline: "Compress Word documents.", category: "Optimize", icon: "compress", Component: CompressWordTool },
  { id: "compress-excel", name: "Compress Excel / CSV", description: "Reduce Excel and CSV file size.", tagline: "Compress Excel and CSV files.", category: "Optimize", icon: "compress", Component: CompressExcelTool },
  { id: "compress-powerpoint", name: "Compress PowerPoint", description: "Reduce PowerPoint file size.", tagline: "Compress PowerPoint presentations.", category: "Optimize", icon: "compress", Component: CompressPowerPointTool },
  { id: "word-to-pdf", name: "Word → PDF", description: "Convert Word documents to PDF.", tagline: "Convert Word to PDF.", category: "Convert", icon: "type", Component: WordToPdfTool },
  { id: "excel-to-pdf", name: "Excel / CSV → PDF", description: "Convert Excel and CSV to PDF.", tagline: "Convert Excel and CSV to PDF.", category: "Convert", icon: "type", Component: ExcelToPdfTool },
  { id: "powerpoint-to-pdf", name: "PowerPoint → PDF", description: "Convert PowerPoint to PDF.", tagline: "Convert PowerPoint to PDF.", category: "Convert", icon: "type", Component: PowerPointToPdfTool },

  // Advanced (Phase 3)
  { id: "pdf-to-excel", name: "PDF → Excel", description: "Extract tables and data to spreadsheets.", tagline: "Extract tables into Excel.", category: "Advanced", icon: "type", Component: PdfToExcelTool },
  { id: "pdf-to-word", name: "PDF → Word", description: "Convert PDF documents to editable Word files.", tagline: "Convert to editable Word documents.", category: "Advanced", icon: "type", Component: PdfToWordTool },
  { id: "ocr", name: "OCR PDF", description: "Make scanned documents searchable with OCR.", tagline: "Extract text from scanned PDFs.", category: "Advanced", icon: "type", Component: OcrTool },
  // Media

  { id: "pdf-to-html", name: "PDF → HTML", description: "Convert PDF documents to HTML format.", tagline: "Convert PDF documents to an HTML format.", category: "Convert", icon: "type", Component: PDFToHTMLTool },
  { id: "crop-image", name: "Crop Image", description: "Crop your images to any size.", tagline: "Crop images.", category: "Media", icon: "crop", Component: CropImageTool },
  { id: "remove-bg", name: "Remove Background", description: "Remove the background from any image.", tagline: "Remove the background from an image.", category: "Media", icon: "img2pdf", Component: RemoveBackgroundTool },
  { id: "resize-image", name: "Resize Image", description: "Change the dimensions of your image.", tagline: "Change image dimensions.", category: "Media", icon: "crop", Component: ResizeImageTool },
  { id: "html-to-image", name: "HTML → Image", description: "Convert HTML snippets into images.", tagline: "Convert HTML code to an image.", category: "Media", icon: "img2pdf", Component: HTMLToImageTool },
  { id: "watermark-image", name: "Watermark Image", description: "Add a watermark to your images.", tagline: "Overlay text or an image on your image.", category: "Media", icon: "watermark", Component: WatermarkImageTool },
  { id: "rotate-image", name: "Rotate Image", description: "Rotate your images in the browser.", tagline: "Turn images to the right orientation.", category: "Media", icon: "rotate", Component: RotateImageTool },
  { id: "blur-face", name: "Blur Face", description: "Automatically detect and blur faces in images.", tagline: "Blur faces in images for privacy.", category: "Media", icon: "shield", Component: BlurFaceTool },
  { id: "image-compress", name: "Compress Image", description: "Reduce image file size while maintaining quality.", tagline: "Reduce image size without losing visual quality.", category: "Media", icon: "compress", Component: ImageCompressTool },
  { id: "image-convert", name: "Convert Image", description: "Convert images between formats (PNG, JPG, WEBP).", tagline: "Change image formats easily.", category: "Media", icon: "img2pdf", Component: ImageConvertTool },
  { id: "video-compress", name: "Compress Video", description: "Reduce MP4 video file size using FFmpeg.", tagline: "Shrink video files using WebAssembly.", category: "Media", icon: "compress", Component: VideoCompressTool },
];

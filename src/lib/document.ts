import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import type { DocumentParseResult } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url,
).toString();

async function renderPageToDataUrl(page: pdfjsLib.PDFPageProxy) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create a canvas for OCR.');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  return canvas.toDataURL('image/png');
}

async function recognizeImages(images: string[]) {
  const worker = await createWorker('eng');
  const pages: string[] = [];

  try {
    for (const image of images) {
      const result = await worker.recognize(image);
      pages.push(result.data.text);
    }
  } finally {
    await worker.terminate();
  }

  return pages.join('\n');
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item;
}

export async function parsePdf(file: File): Promise<DocumentParseResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const textPages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => (isTextItem(item) ? item.str : ''))
      .join(' ')
      .trim();

    textPages.push(pageText);
  }

  const directText = textPages.join('\n').trim();

  if (directText.length >= 24) {
    return {
      rawText: directText,
      extractionMethod: 'Embedded PDF text',
      pageCount: pdf.numPages,
    };
  }

  const renderedPages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    renderedPages.push(await renderPageToDataUrl(page));
  }

  const ocrText = await recognizeImages(renderedPages);

  return {
    rawText: ocrText,
    extractionMethod: 'OCR from rendered PDF pages',
    pageCount: pdf.numPages,
  };
}

export async function parseImage(file: File): Promise<DocumentParseResult> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const rawText = await recognizeImages([imageUrl]);

    return {
      rawText,
      extractionMethod: 'OCR from image',
      pageCount: 1,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

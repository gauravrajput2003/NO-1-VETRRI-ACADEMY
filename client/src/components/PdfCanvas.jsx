import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfCanvas({ url, page, onPageCount }) {
  const container = useRef(null), canvas = useRef(null), renderTask = useRef(null);
  const [document, setDocument] = useState(null), [error, setError] = useState(''), [width, setWidth] = useState(800), [zoom, setZoom] = useState(1);
  useEffect(() => {
    setError(''); setDocument(null);
    const task = getDocument({ url }); let active = true;
    task.promise.then((pdf) => { if (active) { setDocument(pdf); onPageCount(pdf.numPages); } }).catch(() => { if (active) setError('Unable to display this PDF. Refresh its secure link or open it separately.'); });
    return () => { active = false; renderTask.current?.cancel(); task.destroy(); };
  }, [url]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(250, Math.min(1100, entry.contentRect.width - 24))));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document) return;
    let active = true;
    const render = async () => {
      try {
        if (renderTask.current) { renderTask.current.cancel(); await renderTask.current.promise.catch(() => {}); }
        const pdfPage = await document.getPage(Math.min(document.numPages, Math.max(1, page)));
        if (!active || !canvas.current) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: width / original.width * zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.current.width = Math.floor(viewport.width * ratio); canvas.current.height = Math.floor(viewport.height * ratio);
        canvas.current.style.width = `${viewport.width}px`; canvas.current.style.height = `${viewport.height}px`;
        renderTask.current = pdfPage.render({ canvas: canvas.current, canvasContext: canvas.current.getContext('2d'), viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
        await renderTask.current.promise;
      } catch (cause) { if (active && cause.name !== 'RenderingCancelledException') setError('This page could not be rendered. Try refreshing the PDF link.'); }
    };
    render(); return () => { active = false; renderTask.current?.cancel(); };
  }, [document, page, width, zoom]);
  return <section ref={container} className="space-y-2"><div className="flex gap-3 items-center"><label>Zoom<select className="input-field w-28" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>{[0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value * 100}%</option>)}</select></label><p className="text-white/50 text-sm" aria-live="polite">{document ? `Page ${page} of ${document.numPages}` : 'Loading PDF…'}</p></div>{error && <p role="alert" className="text-red-300">{error}</p>}<div className="max-h-[75vh] overflow-auto rounded-lg bg-white/10 p-3"><canvas ref={canvas} className="bg-white mx-auto" role="img" aria-label={`PDF page ${page}`} /></div></section>;
}

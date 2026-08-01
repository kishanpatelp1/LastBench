import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

interface MediaLightboxProps {
  urls: string[];
  initialIndex?: number;
  isVideo?: boolean;
  onClose: () => void;
}

export function MediaLightbox({ urls, initialIndex = 0, isVideo = false, onClose }: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);

  const canNext = currentIndex < urls.length - 1;
  const canPrev = currentIndex > 0;

  const goNext = useCallback(() => {
    if (canNext) {
      setCurrentIndex((i) => i + 1);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [canNext]);

  const goPrev = useCallback(() => {
    if (canPrev) {
      setCurrentIndex((i) => i - 1);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [canPrev]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 4));
  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleFullscreen = () => {
    if (isVideo && videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
      return;
    }
    const win = window.open('about:blank', '_blank');
    if (win) {
      const doc = win.document;
      const body = doc.body;
      const img = doc.createElement('img');

      doc.title = 'Image';
      body.style.margin = '0';
      body.style.background = '#000';
      body.style.display = 'flex';
      body.style.alignItems = 'center';
      body.style.justifyContent = 'center';
      body.style.minHeight = '100vh';

      img.src = urls[currentIndex] ?? '';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100vh';
      img.style.objectFit = 'contain';

      body.replaceChildren(img);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = urls[currentIndex] ?? '';
    a.download = `lastbench-media-${currentIndex + 1}`;
    a.click();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const currentUrl = urls[currentIndex] ?? '';

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.95)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-3">
            {/* Index pill */}
            {urls.length > 1 && (
              <span className="text-white text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">
                {currentIndex + 1} / {urls.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isVideo && (
              <>
                <button
                  onClick={zoomOut}
                  disabled={scale <= 1}
                  className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-white/60 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 4}
                  className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
              </>
            )}
            <button
              onClick={handleFullscreen}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              title="Fullscreen"
            >
              <Maximize2 size={18} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MAIN VIEWER */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
          {/* Prev Arrow */}
          {canPrev && (
            <button
              onClick={goPrev}
              className="absolute left-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 cursor-pointer transition-all hover:scale-110"
              title="Previous (←)"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Media Content */}
          <div
            className="relative flex items-center justify-center w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center w-full h-full"
              >
                {isVideo ? (
                  <video
                    ref={videoRef}
                    src={currentUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-md shadow-2xl"
                    style={{ maxHeight: 'calc(100vh - 140px)' }}
                  />
                ) : (
                  <img
                    src={currentUrl}
                    alt={`Media ${currentIndex + 1}`}
                    className="max-w-full max-h-full rounded-md shadow-2xl object-contain select-none"
                    style={{
                      maxHeight: 'calc(100vh - 140px)',
                      transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
                      transition: isDragging ? 'none' : 'transform 0.2s ease',
                      willChange: 'transform',
                    }}
                    draggable={false}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next Arrow */}
          {canNext && (
            <button
              onClick={goNext}
              className="absolute right-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 cursor-pointer transition-all hover:scale-110"
              title="Next (→)"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* BOTTOM THUMBNAIL STRIP (only for multi-image) */}
        {urls.length > 1 && !isVideo && (
          <div className="shrink-0 py-3 px-4 flex justify-center gap-2" style={{ background: 'rgba(0,0,0,0.6)' }}>
            {urls.map((url, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setScale(1); setOffset({ x: 0, y: 0 }); }}
                className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  i === currentIndex ? 'border-primary scale-110' : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/50'
                }`}
              >
                <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* KEYBOARD HINTS */}
        <div className="shrink-0 py-2 text-center text-xs text-white/30">
          {urls.length > 1 && <span className="mr-4">← → to navigate</span>}
          {!isVideo && <span className="mr-4">+ - to zoom</span>}
          <span>Esc to close</span>
        </div>
      </motion.div>,
    document.body
  );
}

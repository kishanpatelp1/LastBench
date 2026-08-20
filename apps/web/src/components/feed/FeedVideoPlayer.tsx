import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Global Single-Video Coordinator ──────────────────────────────────────────
// Ensures only ONE video plays across the entire application at any given time.
type VideoPlayListener = (activeId: string) => void;
const activeListeners = new Set<VideoPlayListener>();
let currentActiveVideoId: string | null = null;

function notifyVideoStartedPlaying(id: string) {
  currentActiveVideoId = id;
  activeListeners.forEach((listener) => listener(id));
}

function registerVideoListener(listener: VideoPlayListener) {
  activeListeners.add(listener);
  return () => {
    activeListeners.delete(listener);
  };
}

interface FeedVideoPlayerProps {
  src: string;
  id?: string;
  onFullscreen?: () => void;
  className?: string;
}

export function FeedVideoPlayer({ src, id, onFullscreen, className = '' }: FeedVideoPlayerProps) {
  const autoId = useId();
  const playerId = id || src || autoId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState<'play' | 'pause' | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // ─── Global Single-Video Lock Listener ──────────────────────────────────────
  useEffect(() => {
    const unregister = registerVideoListener((activeId) => {
      // If another video started playing, pause this one immediately
      if (activeId !== playerId) {
        const video = videoRef.current;
        if (video && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      }
    });

    return () => {
      unregister();
    };
  }, [playerId]);

  // ─── IntersectionObserver for Feed Autoplay & Auto-Pause ────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          // Scrolled into center view -> autoplay (muted by default)
          // Broadcast to ensure all other feed videos immediately pause
          video
            .play()
            .then(() => {
              setIsPlaying(true);
              notifyVideoStartedPlaying(playerId);
            })
            .catch(() => {
              // If browser blocked unmuted playback, enforce muted and retry
              video.muted = true;
              setIsMuted(true);
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                  notifyVideoStartedPlaying(playerId);
                })
                .catch(() => {});
            });
        } else if (entry.intersectionRatio < 0.25) {
          // Scrolled away -> auto pause to save resources
          if (!video.paused) {
            video.pause();
            setIsPlaying(false);
          }
          if (currentActiveVideoId === playerId) {
            currentActiveVideoId = null;
          }
        }
      },
      {
        threshold: [0.2, 0.55, 0.8],
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (video && !video.paused) {
        video.pause();
      }
    };
  }, [playerId]);

  // ─── Video Event Listeners ──────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  // ─── Controls ───────────────────────────────────────────────────────────────
  const togglePlay = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      if (video.paused || video.ended) {
        video
          .play()
          .then(() => {
            setIsPlaying(true);
            notifyVideoStartedPlaying(playerId);
            setShowCenterIcon('play');
            setTimeout(() => setShowCenterIcon(null), 500);
          })
          .catch(() => {});
      } else {
        video.pause();
        setIsPlaying(false);
        if (currentActiveVideoId === playerId) {
          currentActiveVideoId = null;
        }
        setShowCenterIcon('pause');
        setTimeout(() => setShowCenterIcon(null), 500);
      }
    },
    [playerId]
  );

  const toggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      const nextMuted = !isMuted;
      video.muted = nextMuted;
      setIsMuted(nextMuted);
    },
    [isMuted]
  );

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const progressEl = progressRef.current;
    const video = videoRef.current;
    if (!progressEl || !video || !duration) return;

    const rect = progressEl.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(pos * duration, duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
      className={`rounded-xl overflow-hidden bg-black border border-border/80 shadow-md relative group cursor-pointer select-none ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        loop
        muted={isMuted}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="w-full max-h-80 sm:max-h-96 md:max-h-[30rem] object-contain mx-auto block"
      />

      {/* Center Play/Pause Animated Splash Indicator */}
      <AnimatePresence>
        {showCenterIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none z-20"
          >
            {showCenterIcon === 'play' ? (
              <Play size={24} className="text-white fill-white ml-1" />
            ) : (
              <Pause size={24} className="text-white fill-white" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner Fullscreen Lightbox Button */}
      {onFullscreen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFullscreen();
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white transition-opacity duration-200 z-30 cursor-pointer ${
            isHovered || !isPlaying ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
          }`}
          title="Fullscreen / Lightbox"
        >
          <Maximize2 size={14} />
        </button>
      )}

      {/* Floating Mute/Unmute Audio Pill Button */}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-xs transition-all z-30 cursor-pointer flex items-center gap-1.5 shadow-lg border border-white/10"
        title={isMuted ? 'Unmute audio' : 'Mute audio'}
      >
        {isMuted ? (
          <>
            <VolumeX size={15} className="text-white/90" />
            <span className="text-[10px] font-bold pr-1 text-white/90 hidden sm:inline">Muted</span>
          </>
        ) : (
          <Volume2 size={15} className="text-primary" />
        )}
      </button>

      {/* Bottom Progress Bar & Timestamp (Reddit/Insta style) */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-200 z-20 ${
          isHovered || !isPlaying ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="text-white hover:text-primary transition-colors cursor-pointer p-0.5"
          >
            {isPlaying ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white" />}
          </button>

          {/* Scrubber Bar */}
          <div
            ref={progressRef}
            onClick={handleScrub}
            className="flex-1 h-1.5 bg-white/20 hover:h-2.5 rounded-full cursor-pointer transition-all relative overflow-hidden group/bar"
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Time indicator */}
          <span className="text-[10px] font-mono text-white/80 shrink-0 font-medium">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

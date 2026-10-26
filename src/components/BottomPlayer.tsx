import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  ListMusic,
  FileText,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext.tsx';
import {
  formatTime,
  formatDynamicDuration,
  decodeHtmlEntities,
} from '../utils/audioUtils.ts';
import { getYouTubeThumbnail } from '../utils/youtubeUtils.ts';
import { CoverArt } from './CoverArt.tsx';

interface BottomPlayerProps {
  isMobileVisible?: boolean;
  onCloseMobile?: () => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  isMobileVisible = false,
  onCloseMobile,
}) => {
  const {
    currentTrack,
    isPlaying,
    playerStatus,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffle,
    likedTrackIds,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    toggleLike,
    isQueueOpen,
    toggleQueue,
    isLyricsOpen,
    toggleLyrics,
  } = useMusic();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [showVolumeDrawer, setShowVolumeDrawer] = useState(false);
  const scrubBarRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) {
    return null;
  }

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const activeTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (activeTime / duration) * 100)) : 0;

  const thumbnailUrl = currentTrack.youtubeId
    ? getYouTubeThumbnail(currentTrack.youtubeId)
    : currentTrack.coverUrl;

  const cleanTitle = decodeHtmlEntities(currentTrack.title);
  const cleanArtist = decodeHtmlEntities(currentTrack.artist);
  const cleanAlbum = decodeHtmlEntities(currentTrack.album);

  const handleScrubStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    updateScrubFromCoords(e.clientX, false);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateScrubFromCoords(moveEvent.clientX, false);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsScrubbing(false);
      updateScrubFromCoords(upEvent.clientX, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchScrubStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!e.touches[0]) return;
    setIsScrubbing(true);
    updateScrubFromCoords(e.touches[0].clientX, false);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches[0]) {
        updateScrubFromCoords(moveEvent.touches[0].clientX, false);
      }
    };

    const onTouchEnd = (endEvent: TouchEvent) => {
      setIsScrubbing(false);
      if (endEvent.changedTouches[0]) {
        updateScrubFromCoords(endEvent.changedTouches[0].clientX, true);
      }
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  const updateScrubFromCoords = (clientX: number, commit = false) => {
    if (!scrubBarRef.current || duration <= 0) return;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newSeconds = ratio * duration;
    setScrubValue(newSeconds);
    if (commit) {
      seek(newSeconds);
    }
  };

  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-4 h-4 text-slate-400" />;
    if (volume < 0.5) return <Volume1 className="w-4 h-4 text-slate-300" />;
    return <Volume2 className="w-4 h-4 text-slate-300" />;
  };

  return (
    <div className={`shrink-0 w-full z-40 bg-[#0c0e16]/98 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] select-none transition-all duration-300 ${
      isMobileVisible ? 'block animate-in slide-in-from-bottom-3' : 'hidden md:block'
    }`}>
      {/* Top interactive seekbar/scrubber across entire player top edge */}
      <div
        ref={scrubBarRef}
        onMouseDown={handleScrubStart}
        onTouchStart={handleTouchScrubStart}
        role="slider"
        aria-label="Audio scrubber"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(activeTime)}
        className="w-full h-1.5 hover:h-2.5 bg-slate-800/80 cursor-pointer relative group touch-none transition-all duration-150"
      >
        <div
          className="h-full bg-emerald-500 group-hover:bg-emerald-400 transition-all duration-75 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2" />
        </div>
      </div>

      <div className="w-full px-3 sm:px-6 py-2 md:py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
        {/* Row 1 on Mobile / Left Section on Desktop: CoverArt + Track Title/Artist + Like Heart */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-3 min-w-0 w-full md:w-1/3 md:max-w-[360px]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-md shrink-0 bg-slate-900 border border-slate-800">
              <CoverArt
                src={thumbnailUrl}
                alt={cleanTitle}
                gradient={currentTrack.gradient}
              />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <h4
                  data-testid="player-track-title"
                  title={cleanTitle}
                  className="text-xs sm:text-sm font-bold text-white truncate"
                >
                  {cleanTitle}
                </h4>
                {playerStatus === 'Buffering' && (
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse shrink-0">
                    <Radio className="w-2 h-2" />
                    <span>Loading</span>
                  </span>
                )}
              </div>
              <p
                title={`${cleanArtist}${cleanAlbum ? ` · ${cleanAlbum}` : ''}`}
                className="text-[11px] text-slate-400 truncate mt-0.5"
              >
                <span>{cleanArtist}</span>
                {cleanAlbum && (
                  <>
                    <span aria-hidden="true" className="text-slate-600 mx-1">
                      ·
                    </span>
                    <span className="text-slate-500">{cleanAlbum}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Controls Right in Row 1: Like Heart & Mobile Collapse */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => toggleLike(currentTrack.id)}
              className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all shrink-0 cursor-pointer ${
                isLiked
                  ? 'text-rose-400 bg-rose-500/15 border border-rose-500/30 shadow-sm shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 hover:bg-slate-800'
              }`}
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              aria-label={isLiked ? 'Unlike song' : 'Like song'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 shrink-0 cursor-pointer"
                title="Hide Player"
                aria-label="Hide player"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Center Section: Desktop Controls & Dynamic mm:ss Timestamps */}
        <div className="hidden md:flex flex-1 max-w-xl flex-col items-center">
          <div className="flex items-center gap-5 mb-1">
            {/* Shuffle / Random Play on Desktop */}
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                shuffle
                  ? 'text-emerald-400 bg-emerald-500/15'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={shuffle ? 'Random Play: ON' : 'Random Play: OFF'}
              aria-label="Toggle shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={playPrev}
              className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Track"
              aria-label="Previous track"
            >
              <SkipBack className="w-5 h-5 fill-slate-300" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-slate-950" />
              ) : (
                <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={playNext}
              className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next Track"
              aria-label="Next track"
            >
              <SkipForward className="w-5 h-5 fill-slate-300" />
            </button>

            {/* Repeat */}
            <button
              onClick={toggleRepeat}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-emerald-400 bg-emerald-500/15'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Toggle repeat mode"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Interactive Range Scrubber + mm:ss Timestamps */}
          <div className="w-full flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums px-2">
            <span data-testid="player-elapsed-time" className="w-10 text-right">
              {formatTime(activeTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={1}
              value={activeTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Seek time scrubber"
              className="flex-1 h-1 bg-slate-800 accent-emerald-500 rounded-full cursor-pointer hover:h-1.5 transition-all"
            />
            <span data-testid="player-total-duration" className="w-10">
              {formatDynamicDuration(duration)}
            </span>
          </div>
        </div>

        {/* Row 2 on Mobile (< md): Dedicated Mobile Transport & Scrubber Bar with Zero Overlap */}
        <div className="flex md:hidden flex-col w-full pt-1.5 border-t border-slate-800/60 gap-1.5">
          {/* Mobile Time Scrubber Bar */}
          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400 px-1">
            <span className="text-slate-300 font-semibold">{formatTime(activeTime)}</span>
            <div className="flex-1 mx-2.5 h-1 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{formatDynamicDuration(duration)}</span>
          </div>

          {/* Transport Controls on Mobile: Shuffle / Random Play is placed on the FAR LEFT of this row */}
          <div className="flex items-center justify-between w-full px-0.5">
            {/* Random Play / Shuffle Button: Clean dedicated 38px touch button, completely isolated from Like */}
            <button
              onClick={toggleShuffle}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                shuffle
                  ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80'
              }`}
              title={shuffle ? 'Random Play: ON' : 'Random Play: OFF'}
              aria-label="Toggle random play / shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={playPrev}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white active:scale-95 cursor-pointer"
              title="Previous track"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4 fill-slate-300" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 cursor-pointer mx-1"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-slate-950" />
              ) : (
                <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={playNext}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white active:scale-95 cursor-pointer"
              title="Next track"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4 fill-slate-300" />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={toggleRepeat}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Toggle repeat mode"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>

            {/* Lyrics Toggle on Mobile */}
            <button
              onClick={toggleLyrics}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                isLyricsOpen
                  ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80'
              }`}
              title="Lyrics"
              aria-label="Toggle lyrics"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Queue Toggle on Mobile */}
            <button
              onClick={toggleQueue}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                isQueueOpen
                  ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/80'
              }`}
              title="Queue"
              aria-label="Toggle queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Right Section: Lyrics, Queue & Volume */}
        <div className="hidden md:flex items-center justify-end gap-2 md:w-1/3">
          {/* Lyrics toggle */}
          <button
            onClick={toggleLyrics}
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isLyricsOpen
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Lyrics"
            aria-label="Toggle lyrics"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Queue toggle */}
          <button
            onClick={toggleQueue}
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isQueueOpen
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Queue"
            aria-label="Toggle queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Control (Desktop slider) */}
          <div
            className="flex items-center gap-2 group relative py-2 pl-1"
            onMouseEnter={() => setShowVolumeDrawer(true)}
            onMouseLeave={() => setShowVolumeDrawer(false)}
          >
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {renderVolumeIcon()}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 md:w-24 h-1 bg-slate-800 accent-emerald-500 rounded-full cursor-pointer hover:h-1.5 transition-all"
              aria-label="Volume slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

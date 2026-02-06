"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PLAYING = "bgm_playing";
const STORAGE_TRACK = "bgm_track";
const TRACKS = ["/sounds/bg_music_1.mp3", "/sounds/bg_music_2.mp3"] as const;
type TrackIndex = 0 | 1;

function loadStored(): { isPlaying: boolean; track: TrackIndex } {
  if (typeof window === "undefined")
    return { isPlaying: true, track: 0 };
  const playing = localStorage.getItem(STORAGE_PLAYING);
  return {
    isPlaying: playing === null ? true : playing === "true",
    track: 0,
  };
}

function saveStored(isPlaying: boolean, track: TrackIndex) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PLAYING, isPlaying ? "true" : "false");
  localStorage.setItem(STORAGE_TRACK, track === 0 ? "1" : "2");
}

export default function BGMControl() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState<TrackIndex>(0);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(TRACKS[0]);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
    return audio;
  }, []);

  useEffect(() => {
    const { isPlaying: storedPlaying, track: storedTrack } = loadStored();
    setIsPlaying(storedPlaying);
    setTrack(storedTrack);
    const audio = ensureAudio();
    audio.src = TRACKS[storedTrack];
    if (storedPlaying) audio.play().catch(() => {});
  }, [ensureAudio]);

  const togglePlayPause = useCallback(() => {
    const next = !isPlaying;
    setIsPlaying(next);
    saveStored(next, track);
    const audio = ensureAudio();
    if (next) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying, track, ensureAudio]);

  const selectTrack = useCallback(
    (idx: TrackIndex) => {
      if (idx === track) return;
      setTrack(idx);
      saveStored(isPlaying, idx);
      const audio = ensureAudio();
      audio.src = TRACKS[idx];
      if (isPlaying) audio.play().catch(() => {});
      else {
        setIsPlaying(true);
        saveStored(true, idx);
        audio.play().catch(() => {});
      }
    },
    [track, isPlaying, ensureAudio]
  );

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-0"
      role="group"
      aria-label="背景音樂控制"
    >
      {expanded ? (
        <div
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-white shadow-lg"
          style={{ backgroundColor: "#cfbaf0" }}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="收合"
            title="收合"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlayPause}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={isPlaying ? "暫停" : "播放"}
            title={isPlaying ? "暫停" : "播放"}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          </button>
          <span className="text-xs text-white/80">曲目</span>
          <button
            type="button"
            onClick={() => selectTrack(0)}
            className="flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{
              backgroundColor: track === 0 ? "rgba(255,255,255,0.3)" : "transparent",
            }}
            aria-label="曲目 1"
            aria-pressed={track === 0}
          >
            1
          </button>
          <button
            type="button"
            onClick={() => selectTrack(1)}
            className="flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{
              backgroundColor: track === 1 ? "rgba(255,255,255,0.3)" : "transparent",
            }}
            aria-label="曲目 2"
            aria-pressed={track === 1}
          >
            2
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 sm:h-9 sm:w-9"
          style={{ backgroundColor: "#cfbaf0" }}
          aria-label="開啟背景音樂控制"
          title="背景音樂"
        >
          <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
        </button>
      )}
    </div>
  );
}

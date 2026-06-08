"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { DOM_VIDEO_CUES, type DomVideoCue } from "@/lib/domVideoCues";

interface CueState {
  active: boolean;
  loaded: boolean;
}

type CueStateMap = Record<string, CueState>;

function createInitialState(): CueStateMap {
  return Object.fromEntries(
    DOM_VIDEO_CUES.map((cue) => [cue.id, { active: false, loaded: false }]),
  ) as CueStateMap;
}

export default function VideoCueLayer() {
  const [cueState, setCueState] = useState<CueStateMap>(() => createInitialState());
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const cueRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setCueRef = useCallback((id: string, node: HTMLDivElement | null) => {
    cueRefs.current[id] = node;
  }, []);

  const setVideoRef = useCallback((id: string, node: HTMLVideoElement | null) => {
    videoRefs.current[id] = node;
  }, []);

  const unloadCue = useCallback((id: string) => {
    setCueState((current) => ({
      ...current,
      [id]: {
        active: false,
        loaded: false,
      },
    }));
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const cue of DOM_VIDEO_CUES) {
      const node = cueRefs.current[cue.id];
      if (!node) continue;

      const preloadObserver = new IntersectionObserver(
        ([entry]) => {
          setCueState((current) => ({
            ...current,
            [cue.id]: {
              ...(current[cue.id] ?? { active: false, loaded: false }),
              loaded: entry.isIntersecting,
            },
          }));
        },
        { root: null, rootMargin: cue.preloadRootMargin, threshold: 0 },
      );

      const playObserver = new IntersectionObserver(
        ([entry]) => {
          setCueState((current) => ({
            ...current,
            [cue.id]: {
              ...(current[cue.id] ?? { active: false, loaded: false }),
              active: entry.isIntersecting,
              loaded: entry.isIntersecting || (current[cue.id]?.loaded ?? false),
            },
          }));
        },
        { root: null, rootMargin: cue.playRootMargin, threshold: 0.05 },
      );

      preloadObserver.observe(node);
      playObserver.observe(node);
      observers.push(preloadObserver, playObserver);
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  useEffect(() => {
    for (const cue of DOM_VIDEO_CUES) {
      const video = videoRefs.current[cue.id];
      const state = cueState[cue.id];
      if (!video || !state) continue;

      if (state.active) {
        if (cue.mode !== "ambient-loop") {
          video.currentTime = 0;
        }
        void video.play().catch(() => {});
      } else {
        video.pause();
        if (!state.loaded) {
          video.removeAttribute("src");
          video.load();
        }
      }
    }
  }, [cueState]);

  return (
    <div className="video-cue-layer" aria-hidden="true">
      {DOM_VIDEO_CUES.map((cue) => {
        const state = cueState[cue.id] ?? { active: false, loaded: false };
        return (
          <div
            key={cue.id}
            ref={(node) => setCueRef(cue.id, node)}
            className="video-cue-anchor"
            data-video-cue={cue.id}
            style={{ top: cue.top }}
          >
            {state.loaded && (
              <VideoCue
                cue={cue}
                isActive={state.active}
                setVideoRef={setVideoRef}
                unloadCue={unloadCue}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function VideoCue({
  cue,
  isActive,
  setVideoRef,
  unloadCue,
}: {
  cue: DomVideoCue;
  isActive: boolean;
  setVideoRef: (id: string, node: HTMLVideoElement | null) => void;
  unloadCue: (id: string) => void;
}) {
  return (
    <video
      ref={(node) => setVideoRef(cue.id, node)}
      className={["video-cue", cue.className, isActive ? "is-active" : ""]
        .filter(Boolean)
        .join(" ")}
      data-mode={cue.mode}
      loop={cue.loop}
      muted
      onAnimationEnd={() => {
        if (cue.mode === "enter-animation") {
          unloadCue(cue.id);
        }
      }}
      onEnded={() => {
        if (!cue.loop || cue.mode === "play-on-visible") {
          unloadCue(cue.id);
        }
      }}
      playsInline
      preload="auto"
      src={cue.src}
      style={
        {
          "--video-cue-width": cue.width,
          "--video-cue-x": cue.x,
          "--video-cue-y": cue.y,
        } as CSSProperties
      }
    />
  );
}

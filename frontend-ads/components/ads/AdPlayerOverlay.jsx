"use client";

import React, { useEffect, useRef, useState } from "react";
import { SkipForward, ExternalLink } from "lucide-react";

/**
 * ভিডিওর উপরে বসা বিজ্ঞাপন লেয়ার।
 *
 * useAdBreaks() থেকে যা আসে সেটাই পাস করো:
 *   const { currentAd, endAd, clickAd } = useAdBreaks({...});
 *   <AdPlayerOverlay ad={currentAd} onEnd={endAd} onClick={clickAd} />
 */
export default function AdPlayerOverlay({ ad, onEnd, onClick }) {
  const adVideoRef = useRef(null);
  const [remaining, setRemaining] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!ad) return undefined;

    setRemaining(ad.duration || 0);
    setCanSkip(false);

    const startedAt = Date.now();

    /* ছবি হলে টাইমারই একমাত্র ভরসা; ভিডিও হলেও টাইমার রাখা হয়,
       কারণ ভিডিও লোড না হলে ইউজার আটকে থাকবে না */
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, Math.ceil((ad.duration || 0) - elapsed));

      setRemaining(left);

      if (ad.skipAfter != null && elapsed >= ad.skipAfter) setCanSkip(true);
      if (left <= 0) {
        clearInterval(timer);
        onEnd?.("COMPLETE");
      }
    }, 250);

    return () => clearInterval(timer);
  }, [ad, onEnd]);

  useEffect(() => {
    if (!ad || ad.creativeType === "IMAGE") return;
    const el = adVideoRef.current;
    if (!el) return;

    const play = el.play();
    if (play?.catch) play.catch(() => {});
  }, [ad]);

  if (!ad) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-black"
      role="dialog"
      aria-label="বিজ্ঞাপন চলছে"
    >
      <div className="relative flex-1">
        {ad.creativeType === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.src}
            alt={ad.title || "বিজ্ঞাপন"}
            className="h-full w-full object-contain"
            onError={() => onEnd?.("COMPLETE")}
          />
        ) : (
          <video
            ref={adVideoRef}
            src={ad.src}
            className="h-full w-full object-contain"
            playsInline
            autoPlay
            onEnded={() => onEnd?.("COMPLETE")}
            /* ক্রিয়েটিভ লোড না হলে ইউজারকে আটকে রাখা যাবে না */
            onError={() => onEnd?.("COMPLETE")}
          />
        )}

        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-medium text-white md:left-3 md:top-3">
          বিজ্ঞাপন · {remaining}s
        </span>

        {canSkip && (
          <button
            type="button"
            onClick={() => onEnd?.("SKIP")}
            className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-black backdrop-blur transition-colors hover:bg-white md:text-sm"
          >
            স্কিপ করো <SkipForward className="h-4 w-4" />
          </button>
        )}

        {!canSkip && ad.skipAfter != null && (
          <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-xs text-white md:text-sm">
            {Math.max(
              0,
              ad.skipAfter - ((ad.duration || 0) - remaining),
            ).toFixed(0)}
            s পর স্কিপ করা যাবে
          </span>
        )}
      </div>

      {ad.cta && ad.clickUrl && (
        <button
          type="button"
          onClick={onClick}
          className="flex w-full cursor-pointer items-center justify-center gap-2 bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 md:text-base"
        >
          {ad.cta}
          <ExternalLink className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

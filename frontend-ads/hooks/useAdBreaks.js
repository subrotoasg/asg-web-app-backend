"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useServeAdsQuery,
  useTrackAdEventMutation,
} from "@/redux/services/adsApi";

/**
 * ভিডিও প্লেয়ারের সাথে বিজ্ঞাপন জুড়ে দেয়।
 *
 * @param contextScope  "CLASS_CONTENT" | "CYCLE_CONTENT" | "LIVE_CLASS"
 * @param contextId     ওই কনটেন্টের uuid
 * @param videoRef      <video> এলিমেন্টের ref
 * @param enabled       false দিলে বিজ্ঞাপন একেবারে বন্ধ
 *
 * ব্যাকএন্ড থেকে আসা লিস্ট ঠিক এই শেপে:
 *   { id, at, src, duration, skipAfter, clickUrl, cta, placement }
 */
export function useAdBreaks({
  contextScope,
  contextId,
  videoRef,
  enabled = true,
}) {
  const [currentAd, setCurrentAd] = useState(null);
  const playedRef = useRef(new Set());
  const resumeAtRef = useRef(0);

  const { data, isError } = useServeAdsQuery(
    { contextScope, contextId },
    { skip: !enabled || !contextScope || !contextId },
  );

  const [trackAdEvent] = useTrackAdEventMutation();

  const ads = useMemo(() => data?.data?.ads || [], [data]);

  const preRoll = useMemo(
    () => ads.find((a) => a.placement === "PRE_ROLL"),
    [ads],
  );

  const midRolls = useMemo(
    () =>
      ads
        .filter((a) => a.placement === "MID_ROLL")
        .sort((a, b) => a.at - b.at),
    [ads],
  );

  const postRoll = useMemo(
    () => ads.find((a) => a.placement === "POST_ROLL"),
    [ads],
  );

  /* ট্র্যাকিং কখনো প্লেব্যাক ভাঙতে পারবে না — তাই সব catch করা */
  const track = useCallback(
    (adId, type, positionSec) => {
      if (!adId) return;
      trackAdEvent({
        adId,
        type,
        contextScope,
        contextId,
        positionSec: Math.floor(positionSec || 0),
      })
        .unwrap()
        .catch(() => {});
    },
    [trackAdEvent, contextScope, contextId],
  );

  const startAd = useCallback(
    (ad) => {
      const video = videoRef?.current;
      if (!ad || !video || playedRef.current.has(ad.id)) return;

      playedRef.current.add(ad.id);
      resumeAtRef.current = video.currentTime;

      video.pause();
      setCurrentAd(ad);
      track(ad.id, "IMPRESSION", video.currentTime);
    },
    [videoRef, track],
  );

  const endAd = useCallback(
    (reason = "COMPLETE") => {
      const video = videoRef?.current;

      if (currentAd) track(currentAd.id, reason, resumeAtRef.current);

      setCurrentAd(null);

      /* বিজ্ঞাপন শেষ হলে ঠিক যেখানে থেমেছিল সেখান থেকেই আবার */
      if (video) {
        try {
          if (Number.isFinite(resumeAtRef.current)) {
            video.currentTime = resumeAtRef.current;
          }
          const resumed = video.play();
          // ব্রাউজার autoplay আটকালে চুপচাপ থেমে যায়, ক্র্যাশ করে না
          if (resumed?.catch) resumed.catch(() => {});
        } catch {
          /* প্লেয়ার ততক্ষণে আনমাউন্ট হয়ে গেলে কিছু করার নেই */
        }
      }
    },
    [currentAd, videoRef, track],
  );

  const clickAd = useCallback(() => {
    if (!currentAd?.clickUrl) return;
    track(currentAd.id, "CLICK", resumeAtRef.current);
    window.open(currentAd.clickUrl, "_blank", "noopener,noreferrer");
  }, [currentAd, track]);

  /* pre-roll — ভিডিও প্রথমবার চালু হওয়ার সাথে সাথে */
  useEffect(() => {
    const video = videoRef?.current;
    if (!video || !enabled || !preRoll) return;

    const onFirstPlay = () => startAd(preRoll);

    video.addEventListener("play", onFirstPlay, { once: true });
    return () => video.removeEventListener("play", onFirstPlay);
  }, [videoRef, enabled, preRoll, startAd]);

  /* mid-roll — timeupdate ধরে, যেই সেকেন্ড পার হলো সেটাই ট্রিগার */
  useEffect(() => {
    const video = videoRef?.current;
    if (!video || !enabled || !midRolls.length) return;

    const onTimeUpdate = () => {
      if (currentAd) return;

      const t = video.currentTime;
      const due = midRolls.find(
        (ad) => !playedRef.current.has(ad.id) && t >= ad.at,
      );

      if (due) startAd(due);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoRef, enabled, midRolls, currentAd, startAd]);

  /* post-roll */
  useEffect(() => {
    const video = videoRef?.current;
    if (!video || !enabled || !postRoll) return;

    const onEnded = () => startAd(postRoll);

    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [videoRef, enabled, postRoll, startAd]);

  /* কনটেন্ট বদলালে "কোনটা দেখানো হয়ে গেছে" রিসেট */
  useEffect(() => {
    playedRef.current = new Set();
    setCurrentAd(null);
  }, [contextId, contextScope]);

  return {
    currentAd,
    endAd,
    clickAd,
    /* সার্ভ কল ফেল করলেও ভিডিও চলবে — শুধু বিজ্ঞাপন থাকবে না */
    hasError: isError,
    totalAds: ads.length,
  };
}

export default useAdBreaks;

"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import VideoPlayer from "../liveClass/protectIframe/theme/VideoPlayer";
import BunnyPlayer from "../liveClass/protectIframe/theme/BunnyPlayer";
import {
  useServeAdsQuery,
  useTrackAdEventMutation,
} from "@/redux/services/adsApi";

const EMPTY = [];

/**
 * classContent-এর শেপ দেখেই বুঝে নেওয়া হয় কোন স্কোপে বিজ্ঞাপন চাইতে হবে।
 *
 *   courseSubjectChapter আছে  → CLASS_CONTENT   (রেকর্ডেড ক্লাস)
 *   cycleSubjectChapter আছে   → CYCLE_CONTENT   (সাইকেলের কনটেন্ট)
 *   লাইভ ক্লাস হলে বাইরে থেকে contextScope="LIVE_CLASS" পাঠিয়ে দিলেই হবে
 *
 * ব্যাকএন্ড ওই একটা id থেকেই course → subject → chapter → content পুরো
 * চেইনটা বের করে নেয়, তাই এখান থেকে আলাদা করে কিছু পাঠাতে হয় না।
 */
const resolveAdContext = (classContent, scopeOverride) => {
  const contextId = classContent?.id || null;

  if (!contextId) return { contextScope: null, contextId: null };

  const contextScope =
    scopeOverride ||
    (classContent?.cycleSubjectChapter ? "CYCLE_CONTENT" : "CLASS_CONTENT");

  return { contextScope, contextId };
};

/**
 * @param classContent   /class/:id থেকে আসা কনটেন্ট
 * @param adsEnabled     স্টুডেন্ট প্যানেলে true, অ্যাডমিন প্রিভিউতে সাধারণত false
 * @param contextScope   লাইভ ক্লাসে "LIVE_CLASS" পাঠাতে হবে, বাকি সময় লাগে না
 */
const CustomVideoPlayer = ({
  classContent,
  adsEnabled = true,
  contextScope: scopeOverride,
}) => {
  const isBunny = classContent?.hostingType === "bunny";
  const key = `${classContent?.id}-${classContent?.videoUrl}`;

  const { contextScope, contextId } = useMemo(
    () => resolveAdContext(classContent, scopeOverride),
    [classContent, scopeOverride],
  );

  /* GET /ads/serve?contextScope=...&contextId=...
     রেসপন্সের data.ads[] ঠিক প্লেয়ারের breaks শেপেই আসে:
     { id, at, src, duration, skipAfter, clickUrl, cta, placement } */
  const { data, isError } = useServeAdsQuery(
    { contextScope, contextId },
    { skip: !adsEnabled || !contextScope || !contextId },
  );

  const [trackAdEvent] = useTrackAdEventMutation();

  const breaks = data?.data?.ads || EMPTY;

  /* POST /ads/track — IMPRESSION / COMPLETE / SKIP / CLICK
     ট্র্যাকিং ফেল করলেও ভিডিও যেন না আটকায়, তাই সব চুপচাপ গিলে ফেলা হয় */
  const handleAdEvent = useCallback(
    ({ adId, type, positionSec = 0 }) => {
      if (!adId || !type || !contextScope || !contextId) return;

      trackAdEvent({
        adId,
        type,
        contextScope,
        contextId,
        positionSec: Math.floor(positionSec),
      })
        .unwrap()
        .catch(() => {});
    },
    [trackAdEvent, contextScope, contextId],
  );

  /* সার্ভ কল ফেল করলে বিজ্ঞাপন ছাড়াই ভিডিও চলবে — ক্লাস কখনো আটকাবে না */
  const adsProp = useMemo(
    () => ({
      enabled: adsEnabled && !isError && breaks.length > 0,
      remote: false,
      breaks,
      onEvent: handleAdEvent,
    }),
    [adsEnabled, isError, breaks, handleAdEvent],
  );

  return (
    <div className="lg:col-span-9 container mx-auto h-full">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="h-full"
      >
        {isBunny ? (
          <BunnyPlayer
            key={key}
            videoId={classContent?.videoUrl}
            poster={classContent?.thumbneil || classContent?.thumbnail}
            ads={adsProp}
          />
        ) : (
          <VideoPlayer
            key={key}
            hostingType="youtube"
            videoUrl={classContent?.videoUrl}
            poster={classContent?.thumbneil || classContent?.thumbnail}
            ads={adsProp}
          />
        )}
      </motion.div>
    </div>
  );
};

export default CustomVideoPlayer;

export const metricsFormats = {
  JSON: "json",
  PROMETHEUS: "prometheus",
};

export const pickQueryFields = ["format"];

export const METRIC_PREFIX = "asg_socket";

export const counterDescriptions = {
  connections: "নতুন socket connection সংখ্যা",
  disconnections: "socket disconnect সংখ্যা",

  watch_join: "watch room এ join সংখ্যা",
  watch_heartbeat: "গৃহীত watch heartbeat সংখ্যা",

  broadcast_emitted: "রুমে পাঠানো online count broadcast",
  broadcast_skipped_not_leader: "অন্য node আগে লক নেওয়ায় বাদ পড়া broadcast",
  broadcast_skipped_unchanged: "count না বদলানোয় বাদ পড়া broadcast",

  presence_flush_calls: "Redis এ presence লেখার Lua call সংখ্যা",
  presence_flush_rooms: "flush এ অন্তর্ভুক্ত রুম সংখ্যা",

  chat_accepted: "গৃহীত চ্যাট মেসেজ",
  chat_rate_limited: "rate limit এ আটকে যাওয়া মেসেজ",
  chat_emitted: "রুমে পৌঁছানো মেসেজ",
  chat_publish: "adapter এ publish সংখ্যা",
  chat_dropped_overflow: "রুম buffer উপচে পড়ায় ফেলে দেওয়া মেসেজ",

  typing_suppressed_large_room: "বড় রুমে বন্ধ করা typing ইভেন্ট",

  progress_update: "সংরক্ষিত video progress আপডেট",
  progress_throttled: "throttle এ বাদ পড়া progress আপডেট",
  progress_persisted: "DB তে লেখা progress row",
  progress_persist_pending: "DB লেখার অপেক্ষায় থাকা row (schema বসানো বাকি)",
};

export const gaugeAggregation = {
  connections: "sum",
  rssMb: "sum",
  heapUsedMb: "sum",
  eventLoopLagMs: "max",
  uptimeSec: "min",
};

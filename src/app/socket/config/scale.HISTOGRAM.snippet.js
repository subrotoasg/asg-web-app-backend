// socket/config/scale.js এর শেষে এই ব্লকটা যোগ করো

export const HISTOGRAM = {
  //ভিডিওকে কয় ভাগে ভাগ করা হবে
  BUCKET_COUNT: 100,

  //এক window এর ভেতর সবাই অন্তত একবার progress পাঠানোর সুযোগ পায়
  //PROGRESS.MIN_INTERVAL_MS (৫s) এর অন্তত ২ গুণ রাখো
  WINDOW_MS: 15_000,

  //process এ জমিয়ে কত পরপর Redis এ HINCRBY
  FLUSH_INTERVAL_MS: 2000,

  KEY_TTL_SEC: 60,

  BROADCAST_INTERVAL_MS: 15_000,

  //এর চেয়ে ছোট রুমে histogram পাঠানো হয় না, avatar list ই যথেষ্ট
  //টেস্ট করার সময় ১ করে নাও
  MIN_ROOM_SIZE: 3,

  MAX_ROOMS_PER_TICK: 200,

  //এতক্ষণ কোনো progress না এলে রুমটা tracking থেকে বাদ
  ROOM_IDLE_MS: 60_000,
};

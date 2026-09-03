# ব্যাকএন্ড এক্সপ্লেইনার — ইউটিউব ভিডিও প্যাকেজ

এই ব্যাকএন্ডের আর্কিটেকচার ব্যাখ্যা করার জন্য তৈরি করা উপকরণ, দুই পর্বে।
সব কনটেন্ট রিপোজিটরির আসল কোড থেকে নেওয়া।

## পর্ব ১ — পুশ নোটিফিকেশন পাইপলাইন

Firebase FCM + BullMQ + Redis + PostgreSQL দিয়ে লাখ লাখ ইউজারকে ফ্রিতে নোটিফিকেশন।

| ফাইল | কী |
|---|---|
| `notification-pipeline-deck.html` | **এনিমেটেড ডেক** — ১৯টা স্লাইড। রেকর্ড করার জন্য এটাই মূল জিনিস |
| `notification-pipeline.pptx` | PowerPoint ভার্সন, প্রতিটা স্লাইডের স্পিকার নোটে বাংলা স্ক্রিপ্ট |
| `youtube-script-bangla.md` | পুরো স্ক্রিপ্ট — হুক, ন্যারেশন, টাইটেল, থাম্বনেইল, চ্যাপ্টার |

## পর্ব ২ — প্রোডাকশনে Redis

ক্যাশ, লক, কিউ, স্ট্রিম, Pub/Sub, রেট লিমিট, প্রেজেন্স — আটটা ভূমিকা,
সাথে ৯টা উন্নতির সুযোগ।

| ফাইল | কী |
|---|---|
| `redis-in-production-deck.html` | **এনিমেটেড ডেক** — ২২টা স্লাইড |
| `redis-in-production.pptx` | PowerPoint ভার্সন, স্পিকার নোটে বাংলা স্ক্রিপ্ট |
| `youtube-script-redis-bangla.md` | পুরো স্ক্রিপ্ট, সাথে ৯টা দুর্বলতার বিস্তারিত |

## এনিমেটেড ডেক চালানো

যেকোনো `*-deck.html` ব্রাউজারে খোলো (ডাবল-ক্লিক করলেই হবে)। দুইটা ডেকের
কন্ট্রোল হুবহু এক।

| কী | কাজ |
|---|---|
| `→` / `Space` | পরের স্লাইড |
| `←` | আগের স্লাইড |
| `A` | অটোপ্লে চালু/বন্ধ (প্রতি স্লাইডের নিজস্ব সময় ধরে এগোবে) |
| `N` | টেলিপ্রম্পটার — ওই স্লাইডে কী বলবে, স্ক্রিনেই দেখাবে |
| `F` | ফুলস্ক্রিন |
| `Home` / `End` | প্রথম / শেষ স্লাইড |

ক্লিক করেও এগোনো যায় — বাঁ দিকের ২৫% এ ক্লিক মানে পেছনে, বাকিটা সামনে।

## রেকর্ড করার নিয়ম

1. `F` চেপে ফুলস্ক্রিন করো
2. OBS-এ Display Capture, ১৯২০×১০৮০, ৩০fps
3. **প্রথমবার অটোপ্লে ব্যবহার করো না** — নিজে `→` চেপে এগোও, তাহলে ব্যাখ্যা
   লম্বা হলেও স্লাইড আগে চলে যাবে না
4. দ্বিতীয় মনিটর থাকলে সেখানে `youtube-script-bangla.md` খুলে রাখো
5. পর্ব ১-এ সবচেয়ে বেশি সময় দাও স্লাইড ০৪ (আর্কিটেকচার), ০৯ (কার্সর পেজিনেশন),
   ১২ (SET NX)-এ। পর্ব ২-এ স্লাইড ১০ (দুই ভার্সন), ১৪ (HyperLogLog),
   ২০–২১ (দুর্বলতা)-তে

## ডেকের কনটেন্ট এডিট করা

সব কনটেন্ট ডেকের HTML ফাইলের ভেতরেই — কোনো বিল্ড স্টেপ নেই,
কোনো ডিপেন্ডেন্সি নেই। ফন্ট Google Fonts থেকে আসে, তাই প্রথমবার ইন্টারনেট লাগবে।

- স্লাইডের টেক্সট → `<section class="slide">` ব্লকগুলো
- টেলিপ্রম্পটারের লেখা → নিচের `<script>`-এ `const script = [...]` অ্যারে
  (স্লাইডের ক্রম আর অ্যারের ক্রম একই)
- অটোপ্লের সময় → প্রতিটা `<section>`-এর `data-dur` (সেকেন্ডে)

PPTX-টা `pptxgenjs` দিয়ে জেনারেট করা। বাংলা টেক্সটের ফন্ট **Nirmala UI**
(Windows-এ ডিফল্ট থাকে)। ম্যাকে খুললে PowerPoint নিজে থেকেই বাংলা-সাপোর্টেড
ফন্টে ফলব্যাক করবে।

## যে কোডগুলো ব্যাখ্যা করা হয়েছে

```
src/app/modules/student/firebase/messaging/
├── pushMessaging/pushMessaging.services.js   ← API: enqueue + log, পাঠায় না
├── pushMessaging/pushMessaging.cache.js      ← ভার্সন-ভিত্তিক ফিড ক্যাশ
├── jobs/queue.js                             ← txQueue, campaignQueue
├── jobs/worker.campaign.js                   ← কোর্স/সাইকেল ব্রডকাস্ট
├── jobs/worker.tx.js                         ← একক ইউজার + সব ইউজার
├── services/sendFcm.js                       ← ৫০০-এর ব্যাচ, invalid token শনাক্ত
├── helper/pushMessaging.helper.js            ← কার্সর পেজিনেশন (generator)
└── utils/{throttle,dedup,batch}.js           ← রেট লিমিট, SET NX লক

src/lib/redis/cache/
├── cache.aside.js                            ← stampede protection
├── cache.lock.js                             ← Lua দিয়ে নিরাপদ লক রিলিজ
└── cache.store.js                            ← TTL + jitter

src/app/cronjobScript/deleteNotifications.js  ← ৭ দিনের ক্লিনআপ
ecosystem.config.cjs                          ← PM2: API আর ওয়ার্কার আলাদা
```

## পর্ব ২-তে যে কোডগুলো ব্যাখ্যা করা হয়েছে

```
src/app/utlis/redis.js                        ← ৪টা আলাদা Redis ক্লায়েন্ট
src/lib/redis/cache/
├── cache.store.js                            ← খাম, TTL, jitter
├── cache.aside.js                            ← fresh/stale/miss, stampede, heartbeat
├── cache.lock.js                             ← Lua compare-and-delete
├── cache.single-flight.js                    ← in-process dedup
└── cache.strict.js                           ← staleTtlMs = 0 (দেখো উন্নতি #৫)

src/app/modules/authentication/cache/         ← অথ + পারমিশন (DELETE ইনভ্যালিডেশন)
src/app/modules/superAdmin/courses/           ← কোর্স ক্যাটালগ (ভার্সন INCR)
src/app/modules/student/courseStudent/        ← my-courses (কম্পোজিট ভার্সন)
src/helper/rateLimit.js                       ← ১২টা রেট লিমিটার
src/app/socket/
├── index.js                                  ← sharded Pub/Sub adapter
├── realtime/watch/redis.js                   ← ZSET + HyperLogLog প্রেজেন্স
├── realtime/watch/scripts.js                 ← ৩টা Lua স্ক্রিপ্ট
├── realtime/watch/presenceBuffer.js          ← ১s বাফার + pipeline
├── queue/chat.queue.js                       ← XADD
├── worker/chat.worker.js                     ← consumer group, XAUTOCLAIM, dead-letter
└── config/scale.js                           ← সব টিউনিং কনস্ট্যান্ট
```

সংখ্যাগুলো কোথা থেকে এলো তার পূর্ণ তালিকা দুইটা স্ক্রিপ্ট ফাইলের শেষেই আছে।

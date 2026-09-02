# নোটিফিকেশন সিস্টেম — ইউটিউব ভিডিও প্যাকেজ

এই ব্যাকএন্ডের পুশ নোটিফিকেশন পাইপলাইন (Firebase FCM + BullMQ + Redis + PostgreSQL)
ব্যাখ্যা করার জন্য তৈরি করা উপকরণ। সব কনটেন্ট রিপোজিটরির আসল কোড থেকে নেওয়া।

## ফাইলগুলো

| ফাইল | কী |
|---|---|
| `notification-pipeline-deck.html` | **এনিমেটেড স্লাইড ডেক** — ১৯টা স্লাইড, চলন্ত ডায়াগ্রাম সহ। রেকর্ড করার জন্য এটাই মূল জিনিস |
| `notification-pipeline.pptx` | একই ডেকের PowerPoint ভার্সন, প্রতিটা স্লাইডের স্পিকার নোটে বাংলা স্ক্রিপ্ট |
| `youtube-script-bangla.md` | পুরো ভিডিও স্ক্রিপ্ট — হুক, স্লাইড-বাই-স্লাইড ন্যারেশন, টাইটেল, থাম্বনেইল, চ্যাপ্টার |

## এনিমেটেড ডেক চালানো

ব্রাউজারে `notification-pipeline-deck.html` খোলো (ডাবল-ক্লিক করলেই হবে)।

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
5. স্লাইড ০৪ (আর্কিটেকচার), ০৯ (কার্সর পেজিনেশন), ১২ (SET NX) — এই তিনটায় সবচেয়ে
   বেশি সময় দাও

## ডেকের কনটেন্ট এডিট করা

সব কনটেন্ট `notification-pipeline-deck.html`-এর ভেতরেই — কোনো বিল্ড স্টেপ নেই,
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

সংখ্যাগুলো কোথা থেকে এলো তার পূর্ণ তালিকা `youtube-script-bangla.md`-এর
শেষে আছে।

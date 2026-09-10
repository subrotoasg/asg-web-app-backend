# `redux/tagTypes.js` — একটা লাইন যোগ করো

```js
export const tagTypesValue = {
  // …তোমার বাকি ট্যাগগুলো
  ADS: "ads",
};

export const tagTypesList = [
  // …বাকিগুলো
  tagTypesValue.ADS,
];
```

`baseApi`-র `tagTypes` অ্যারেতেও `tagTypesValue.ADS` না থাকলে RTK Query
ইনভ্যালিডেশন চুপচাপ কাজ করবে না — তাই ওটা যোগ করা বাধ্যতামূলক।

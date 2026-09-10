import { tagTypesValue } from "../tagTypes";
import { quearyUrlGenerator } from "../utilities/quearyParamsGenerator";
import baseApi from "./baseApi";

const adsApiServices = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // অ্যাডমিন লিস্ট — ট্যাব অনুযায়ী status পাঠানো হয়
    getAllAds: builder.query({
      query: (queryParams) => {
        const url = quearyUrlGenerator("/ads", queryParams);
        return { url, method: "GET" };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((ad) => ({
                type: tagTypesValue.ADS,
                id: ad.id,
              })),
              { type: tagTypesValue.ADS, id: "LIST" },
            ]
          : [{ type: tagTypesValue.ADS, id: "LIST" }],
    }),

    getAdById: builder.query({
      query: (adId) => ({ url: `/ads/${adId}`, method: "GET" }),
      providesTags: (result, error, adId) => [
        { type: tagTypesValue.ADS, id: adId },
      ],
    }),

    // এখন কোথায় কী চলছে
    getRunningAds: builder.query({
      query: (queryParams) => {
        const url = quearyUrlGenerator("/ads/running", queryParams);
        return { url, method: "GET" };
      },
      providesTags: [{ type: tagTypesValue.ADS, id: "RUNNING" }],
    }),

    createAd: builder.mutation({
      query: (formData) => ({
        url: "/ads",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [
        { type: tagTypesValue.ADS, id: "LIST" },
        { type: tagTypesValue.ADS, id: "RUNNING" },
      ],
    }),

    updateAd: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/ads/${id}`,
        method: "PATCH",
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: tagTypesValue.ADS, id },
        { type: tagTypesValue.ADS, id: "LIST" },
        { type: tagTypesValue.ADS, id: "RUNNING" },
      ],
    }),

    // চালু/বন্ধ করার হালকা রুট — পুরো ফর্ম পাঠানো লাগে না
    updateAdStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/ads/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: tagTypesValue.ADS, id },
        { type: tagTypesValue.ADS, id: "LIST" },
        { type: tagTypesValue.ADS, id: "RUNNING" },
      ],
    }),

    deleteAd: builder.mutation({
      query: (id) => ({ url: `/ads/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: tagTypesValue.ADS, id },
        { type: tagTypesValue.ADS, id: "LIST" },
        { type: tagTypesValue.ADS, id: "RUNNING" },
      ],
    }),

    /* প্লেয়ার — কোন কনটেন্টে কোন ad চলবে।
       এখানে quearyUrlGenerator লাগে না — searchTerm/page/limit নেই,
       শুধু দুইটা নির্দিষ্ট প্যারাম যায় */
    serveAds: builder.query({
      query: ({ contextScope, contextId }) => ({
        url: `/ads/serve?contextScope=${encodeURIComponent(
          contextScope,
        )}&contextId=${encodeURIComponent(contextId)}`,
        method: "GET",
      }),
      // ad ইনভ্যালিডেশনে ভিডিও প্লেব্যাক বিঘ্নিত হওয়া উচিত না,
      // তাই এটা ইচ্ছা করেই কোনো ট্যাগ provide করে না
    }),

    trackAdEvent: builder.mutation({
      query: (body) => ({ url: "/ads/track", method: "POST", body }),
    }),
  }),
});

export const {
  useGetAllAdsQuery,
  useGetAdByIdQuery,
  useGetRunningAdsQuery,
  useCreateAdMutation,
  useUpdateAdMutation,
  useUpdateAdStatusMutation,
  useDeleteAdMutation,
  useServeAdsQuery,
  useLazyServeAdsQuery,
  useTrackAdEventMutation,
} = adsApiServices;

export default adsApiServices;

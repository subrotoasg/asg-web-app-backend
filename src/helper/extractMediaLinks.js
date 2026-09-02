export const extractMediaLinks = (urls) => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const videoExtensions = [".mp4", ".mkv"];
  const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".webm"];
  const docsExtensions = [".pdf"];

  let imageUrl = null;
  let videoUrl = null;
  let audioUrl = null;
  let docUrl = null;

  urls.forEach((url) => {
    const extension = url.split(".").pop().toLowerCase();

    if (!imageUrl && imageExtensions.includes(`.${extension}`)) {
      imageUrl = url;
    } else if (!videoUrl && videoExtensions.includes(`.${extension}`)) {
      videoUrl = url;
    } else if (!audioUrl && audioExtensions.includes(`.${extension}`)) {
      audioUrl = url;
    } else if (!docUrl && docsExtensions.includes(`.${extension}`)) {
      docUrl = url;
    }
  });

  return { imageUrl, videoUrl, audioUrl, docUrl };
};

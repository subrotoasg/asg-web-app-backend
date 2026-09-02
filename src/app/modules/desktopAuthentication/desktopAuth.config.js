const normalizeUrl = (value) => value?.trim().replace(/\/+$/, "");

export const getDesktopAuthConfig = () => ({
  publicUrl: normalizeUrl(
    process.env.DESKTOP_AUTH_PUBLIC_URL ||
      "https://api.varsity.aparsclassroom.com",
  ),
  firebase: {
    apiKey: process.env.DESKTOP_AUTH_FIREBASE_API_KEY,
    authDomain: process.env.DESKTOP_AUTH_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.DESKTOP_AUTH_FIREBASE_PROJECT_ID,
    appId: process.env.DESKTOP_AUTH_FIREBASE_APP_ID,
  },
});

export const hasFirebaseBrowserConfig = (firebaseConfig) =>
  Object.values(firebaseConfig).every(
    (value) => typeof value === "string" && value.length > 0,
  );

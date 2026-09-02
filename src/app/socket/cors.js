const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5500",
  "http://localhost:7836",
  "chrome-extension://amknoiejhlmhancpahfcfcfhllgkpbld",

  "http://medical.localhost:3000",
  "http://engineering.localhost:3000",
  "http://varsity.localhost:3000",
  "http://admission.localhost:3000",

  "http://192.168.68.56:3001",
  "http://192.168.68.56:3002",
  "http://192.168.68.56:3003",

  "https://aparsclassroom.com",
  "https://www.apars.shop",

  "https://acwebapp.vercel.app",
  "https://competitivevarsity-webapp.pages.dev",
  "https://www.competitivevarsity-webapp.pages.dev",
  "https://superadmin-webapp.pages.dev",
  "https://www.superadmin-webapp.pages.dev",
  "https://academic-cycle-webapp.pages.dev",
  "https://www.academic-cycle-webapp.pages.dev",

  "https://api.aparsclassroom.com",
  "https://api.bunny.net",
  "https://delivery.bunnycdn.com",
  "https://video.bunnycdn.com",

  "https://live.asgshop.it.com",
  "https://www.live.asgshop.it.com",
  "https://admin.socket.io",
];

export function isAllowedOrigin(origin) {
  if (!origin) return true;

  return (
    allowedOrigins.includes(origin) ||
    origin.endsWith(".aparsclassroom.com") ||
    origin === "https://admin.socket.io"
  );
}

export const socketCorsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Socket CORS blocked: ${origin}`));
  },

  credentials: true,
};

import express from "express";
const app = express();
import bodyParser from "body-parser";
import cors from "cors";
import router from "./app/routes/index.js";
import prisma from "./app/utlis/prisma.js";
import notFoundRoute from "./app/middleware/notFoundRoute.js";
import globalErrorHandler from "./app/middleware/globalErrorHandler.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { apiLimiter } from "./helper/rateLimit.js";
import { captureRequestInfo } from "./app/modules/authentication/auth.utlis.js";
import { desktopAuthRoutes } from "./app/modules/desktopAuthentication/desktopAuth.router.js";
import { httpMetricsMiddleware } from "./app/monitoring/metrics.js";
import "./app/cronjobScript/cronjob.js";

//MiddleWare
app.use(httpMetricsMiddleware);
app.use(captureRequestInfo);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); //Middleware body parser
app.use(express.json());
app.use(cookieParser()); // Middleware to parse cookies
app.use(helmet());
app.disable("x-powered-by");
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
  "https://api.exam.aparsclassroom.com",
  "https://grand-celebration-delta.vercel.app",
];

// CORS options with wildcard subdomain support
const corsOptions = {
  origin: (origin, callback) => {
    // allow server-to-server or tools like Postman
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith(".aparsclassroom.com") ||
      origin.endsWith(".aparsclassroom.com.bd") ||
      origin.endsWith(".asgshop.com.bd") ||
      origin.endsWith(".asg.com.bd") ||
      origin.endsWith(".asg.bd") ||
      origin.endsWith(".asg.com");

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
};

//cors
app.use(cors(corsOptions));

app.set("trust proxy", 1);

app.use(apiLimiter);

//test routes
app.get("/health", async (req, res) => {
  const response = await prisma.$queryRaw`SELECT 1`;
  res.json({
    status: "OK",
    response,
  });
});

//api routes
app.use(desktopAuthRoutes);
app.use("/api/v1", router);

//global error
app.use(globalErrorHandler);

//Not Found MiddleWare
app.use(notFoundRoute);

export default app;

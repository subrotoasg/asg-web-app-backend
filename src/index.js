import { createServer } from "http";
import app from "./app.js";
import config from "./app/config/index.js";
import prisma from "./app/utlis/prisma.js";
import { connectRedis } from "./app/utlis/redis.js";
import { setupSocket } from "./app/socket/index.js";
import { startMetricsServer } from "./app/monitoring/metrics.js";
let server;
let metricsServer;

main().catch((err) => console.log(err));

async function main() {
  try {
    const response = await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful!", response);

    await connectRedis();

    const httpServer = createServer(app);

    setupSocket(httpServer);

    server = httpServer.listen(config.port, () => {
      console.log(`Server is Running http://localhost:${config.port}`);
    });

    metricsServer = startMetricsServer();
  } catch (error) {
    await prisma.$disconnect();
    console.log(error);
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("Unhandled Rejection is detected , shutting down ...");
  //For Asynchronous operations
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on("uncaughtException", (e) => {
  console.log("Unhandled Exception is detected , shutting down ...");
  console.log(e);
  //For Synchronous operations
  process.exit(1);
});

const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Closing server...`);

  try {
    if (server) {
      server.close();
    }
    if (metricsServer) {
      metricsServer.close();
    }
    await prisma.$disconnect();
    console.log("✅ Prisma connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Shutdown error:", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

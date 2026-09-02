import { createServer } from "node:http";
import client from "prom-client";

const METRICS_HOST = "127.0.0.1";
const DEFAULT_METRICS_PORT_BASE = 9464;

const parseNonNegativeInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const workerId = String(
  parseNonNegativeInteger(process.env.NODE_APP_INSTANCE, 0),
);
const metricsPortBase = parseNonNegativeInteger(
  process.env.METRICS_PORT_BASE,
  DEFAULT_METRICS_PORT_BASE,
);
const metricsPort = metricsPortBase + Number(workerId);

if (metricsPort > 65535) {
  throw new Error(`Invalid metrics port: ${metricsPort}`);
}

const register = new client.Registry();

register.setDefaultLabels({
  service: "varsity-api",
  worker: workerId,
});

client.collectDefaultMetrics({
  prefix: "asg_webapp_",
  register,
});

const httpRequestsTotal = new client.Counter({
  name: "asg_webapp_http_requests_total",
  help: "Completed HTTP requests, including client-aborted requests as status 499.",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "asg_webapp_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route", "status_code"],
  buckets: [
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120,
  ],
  registers: [register],
});

const httpRequestsInFlight = new client.Gauge({
  name: "asg_webapp_http_requests_in_flight",
  help: "HTTP requests currently being processed.",
  labelNames: ["method"],
  registers: [register],
});

const httpAbortedRequestsTotal = new client.Counter({
  name: "asg_webapp_http_aborted_requests_total",
  help: "HTTP requests whose client connection closed before a response completed.",
  labelNames: ["method", "route"],
  registers: [register],
});

const normalizeRoute = (route) => {
  const normalized = route.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized || "/";
};

const resolveRoute = (req) => {
  if (req.path === "/health") {
    return "/health";
  }

  const routePath = req.route?.path;
  if (typeof routePath !== "string") {
    return "__unmatched__";
  }

  const route = normalizeRoute(`${req.baseUrl || ""}${routePath}`);
  return route.length <= 240 ? route : "__route_too_long__";
};

export const httpMetricsMiddleware = (req, res, next) => {
  const method = req.method || "UNKNOWN";
  const startedAt = process.hrtime.bigint();
  let recorded = false;

  httpRequestsInFlight.inc({ method });

  const record = (statusCode, aborted = false) => {
    if (recorded) return;
    recorded = true;

    const durationSeconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const route = resolveRoute(req);
    const labels = {
      method,
      route,
      status_code: String(statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
    httpRequestsInFlight.dec({ method });

    if (aborted) {
      httpAbortedRequestsTotal.inc({ method, route });
    }
  };

  res.once("finish", () => record(res.statusCode));
  res.once("close", () => {
    if (!res.writableFinished) {
      record(499, true);
    }
  });

  next();
};

export const startMetricsServer = () => {
  let stopped = false;
  let retryTimer;
  let useReusePort = true;

  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;

    if (req.method !== "GET" || pathname !== "/metrics") {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found\n");
      return;
    }

    try {
      const body = await register.metrics();
      res.writeHead(200, { "content-type": register.contentType });
      res.end(body);
    } catch (error) {
      console.error("Failed to render Prometheus metrics", error);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Metrics unavailable\n");
    }
  });

  const listen = () => {
    if (stopped) return;

    const listenOptions = {
      host: METRICS_HOST,
      port: metricsPort,
    };

    if (useReusePort) {
      listenOptions.reusePort = true;
    }

    server.listen(listenOptions);
  };

  server.on("listening", () => {
    console.log(
      `Prometheus metrics listening on http://${METRICS_HOST}:${metricsPort}/metrics`,
    );
  });

  server.on("error", (error) => {
    if (error.code === "ENOTSUP" && useReusePort && !stopped) {
      useReusePort = false;
      retryTimer = setTimeout(listen, 100);
      retryTimer.unref();
      return;
    }

    if (error.code === "EADDRINUSE" && !stopped) {
      console.warn(
        `Metrics port ${metricsPort} is still in use; retrying in 1 second`,
      );
      retryTimer = setTimeout(listen, 1000);
      retryTimer.unref();
      return;
    }

    console.error("Prometheus metrics server error", error);
  });

  listen();

  return {
    close(callback) {
      stopped = true;
      clearTimeout(retryTimer);

      if (server.listening) {
        server.close(callback);
      } else if (callback) {
        callback();
      }
    },
  };
};

export { metricsPort, register };

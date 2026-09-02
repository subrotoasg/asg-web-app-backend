
const counters = new Map();

let lagMs = 0;

let lagTimer = null;

export const metrics = {
  inc(name, value = 1) {
    counters.set(name, (counters.get(name) || 0) + value);
  },

  snapshot(io) {
    const memory = process.memoryUsage();

    const data = {
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
      connections: io?.engine?.clientsCount || 0,
      eventLoopLagMs: lagMs,
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      counters: Object.fromEntries(counters),
    };

    return data;
  },

  reset() {
    counters.clear();
  },
};

export function startMetrics() {
  if (lagTimer) {
    return;
  }

  let last = Date.now();

  lagTimer = setInterval(() => {
    const now = Date.now();

    lagMs = Math.max(0, now - last - 500);

    last = now;
  }, 500);

  if (typeof lagTimer.unref === "function") {
    lagTimer.unref();
  }
}

export function stopMetrics() {
  if (lagTimer) {
    clearInterval(lagTimer);

    lagTimer = null;
  }
}

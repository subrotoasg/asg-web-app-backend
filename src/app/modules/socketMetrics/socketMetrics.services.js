import { readAllNodes } from "../../socket/metrics/publisher.js";

import {
  METRIC_PREFIX,
  counterDescriptions,
  gaugeAggregation,
} from "./socketMetrics.constants.js";

function aggregateGauges(nodes) {
  const result = {};

  for (const [field, mode] of Object.entries(gaugeAggregation)) {
    const values = nodes.map((node) => Number(node?.[field] || 0));

    if (!values.length) {
      result[field] = 0;

      continue;
    }

    if (mode === "sum") {
      result[field] = values.reduce((total, value) => total + value, 0);
    }

    if (mode === "max") {
      result[field] = Math.max(...values);
    }

    if (mode === "min") {
      result[field] = Math.min(...values);
    }
  }

  return result;
}

function aggregateCounters(nodes) {
  const totals = {};

  for (const node of nodes) {
    for (const [name, value] of Object.entries(node?.counters || {})) {
      totals[name] = (totals[name] || 0) + Number(value || 0);
    }
  }

  return totals;
}

const getSocketMetricsfromRedis = async () => {
  const nodes = await readAllNodes();

  return {
    generatedAt: new Date().toISOString(),

    nodeCount: nodes.length,

    gauges: aggregateGauges(nodes),

    counters: aggregateCounters(nodes),

    descriptions: counterDescriptions,

    nodes,
  };
};

function escapeLabel(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function gaugeLines(name, help, nodes, field) {
  const lines = [
    `# HELP ${METRIC_PREFIX}_${name} ${help}`,
    `# TYPE ${METRIC_PREFIX}_${name} gauge`,
  ];

  for (const node of nodes) {
    lines.push(
      `${METRIC_PREFIX}_${name}{pid="${escapeLabel(node.pid)}"} ${Number(
        node?.[field] || 0,
      )}`,
    );
  }

  return lines;
}

const getSocketMetricsPrometheusfromRedis = async () => {
  const nodes = await readAllNodes();

  const lines = [];

  lines.push(
    ...gaugeLines(
      "connections",
      "Current websocket connections",
      nodes,
      "connections",
    ),
  );

  lines.push(
    ...gaugeLines(
      "event_loop_lag_ms",
      "Event loop lag in milliseconds",
      nodes,
      "eventLoopLagMs",
    ),
  );

  lines.push(
    ...gaugeLines("rss_mb", "Resident set size in MB", nodes, "rssMb"),
  );

  lines.push(
    ...gaugeLines("heap_used_mb", "Heap used in MB", nodes, "heapUsedMb"),
  );

  lines.push(
    ...gaugeLines(
      "uptime_seconds",
      "Process uptime in seconds",
      nodes,
      "uptimeSec",
    ),
  );

  lines.push(`# HELP ${METRIC_PREFIX}_nodes Live socket processes reporting`);

  lines.push(`# TYPE ${METRIC_PREFIX}_nodes gauge`);

  lines.push(`${METRIC_PREFIX}_nodes ${nodes.length}`);

  lines.push(
    `# HELP ${METRIC_PREFIX}_events_total Cumulative socket event counters`,
  );

  lines.push(`# TYPE ${METRIC_PREFIX}_events_total counter`);

  for (const node of nodes) {
    for (const [event, value] of Object.entries(node?.counters || {})) {
      lines.push(
        `${METRIC_PREFIX}_events_total{pid="${escapeLabel(
          node.pid,
        )}",event="${escapeLabel(event)}"} ${Number(value || 0)}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
};

export const SocketMetricsServices = {
  getSocketMetricsfromRedis,
  getSocketMetricsPrometheusfromRedis,
};

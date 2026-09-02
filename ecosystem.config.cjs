module.exports = {
  apps: [
    {
      name: "webapp-backend",
      script: "./src/index.js",
      instances: "6",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        METRICS_PORT_BASE: 9464,
      },
    },
    // {
    //   name: "ocr-worker",
    //   script: "./src/app/queueNworker/workers/ocrWorker.js",
    //   env: {
    //     NODE_ENV: "production",
    //   },
    // },
    // {
    //   name: "embed-worker",
    //   script: "./src/app/queueNworker/workers/embeddingWorker.js",
    //   env: {
    //     NODE_ENV: "production",
    //   },
    // },
    {
      name: "tx",
      script: "./src/app/modules/student/firebase/messaging/jobs/worker.tx.js",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "campain",
      script:
        "./src/app/modules/student/firebase/messaging/jobs/worker.campaign.js",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "sync-transaction",
      script: "./src/app/queueNworker/workers/syncTransactionWorker.js",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "chat-message-worker",
      script: "./src/app/socket/worker/chat.worker.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

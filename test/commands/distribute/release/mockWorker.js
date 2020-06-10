const { parentPort } = require("worker_threads");

parentPort.on("message", (evt) => {
  console.log("Mock worker script received message", evt);
  parentPort.postMessage({ Error: null, ChunkNumber: evt.ChunkNumber });
});

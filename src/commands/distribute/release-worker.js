const { parentPort } = require("worker_threads");
const fetch = require("node-fetch");
var workerDomain = "emptyDomain";
function sendChunk(chunk, chunkNumber, url, correlationId, domain) {
  //@ts-ignore
  //this check addresses a trailing zeros bug, where part of the chunk will be empty. Simply touching the size is enough to "fix" the problem
  const size = chunk.size;
  fetch(domain + "/" + url, {
    method: "POST",
    headers: {
      "X-Correlation-ID": correlationId,
    },
    body: chunk,
  })
  .then((response) => {
    if (!response.ok) {
      console.log("worker upload error, not ok");
      throw new HttpError(response.status, response.statusText);
    }
    return response.json();
  })
  .then((json) => {
    console.log("worker upload complete:", json);
    parentPort.postMessage({ Error: json.Error, ChunkNumber: chunkNumber });
  })
  .catch((error) => {
    console.log("worker upload error:", error);
    parentPort.postMessage({ Error: true, ChunkNumber: chunkNumber });
  });
}

parentPort.on("message", (evt) => {
  try {
    console.log("worker script received message", evt);
    if (evt.Domain) {
      workerDomain = evt.Domain;
      console.log("no domain");
      return;
    }
    if (!evt.Chunk) {
      console.log("no chunk");
      return;
    }
    console.log("worker script start send chunk to " + workerDomain);
    sendChunk(evt.Chunk, evt.ChunkNumber, evt.Url, evt.CorrelationId, workerDomain);
  } catch (error) {
    console.log("error inside worker.js: ", error);
  }
});

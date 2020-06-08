const { parentPort } = require("worker_threads");
const fetch = require("node-fetch");

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
        throw new HttpError(response.status, response.statusText);
      }
      return response.json();
    })
    .then((json) => {
      parentPort.postMessage({ Error: json.Error, ChunkNumber: chunkNumber });
    })
    .catch((error) => {
      parentPort.postMessage({ Error: true, ChunkNumber: chunkNumber });
    });
}

parentPort.on("message", (evt) => {
  if (evt.data.Domain) {
    mcfusWorker.Domain = evt.data.Domain;
    return;
  }
  if (!evt.data.Chunk) {
    return;
  }
  sendChunk(evt.data.Chunk, evt.data.ChunkNumber, evt.data.Url, evt.data.CorrelationId);
});

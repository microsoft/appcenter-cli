import {
  InflightModelChunk,
  IUploadData,
  IUploadStatus,
  McFusUploadState,
  IProgress,
  IUploadStats,
  McFusMessageLevel,
  IRequiredSettings,
  IEventSettings,
  IInitializeSettings,
  IOptionalSettings,
  IOnResumeStartParams,
  IWorker,
  McFusFile,
  LogProperties,
} from "./mc-fus-uploader-types";
import { Worker } from "worker_threads";

import MimeTypes from "./mc-fus-mime-types";

export class WorkerNode extends Worker implements IWorker {
  Domain: string = "";
  set onmessage(value: (ev: MessageEvent) => any) {
    super.addListener("message", value);
  }
  set onerror(value: () => any) {
    super.addListener("error", value);
  }
  sendChunk(chunk: any, chunkNumber: number, url: string, correlationId: string): void {}
  postMessage(message: any): void {
    super.postMessage(message);
  }
  terminate(): void {
    super.terminate();
  }
}

// Build a worker from an anonymous function body
let blobURL;
if (URL.createObjectURL) {
  blobURL = URL.createObjectURL(new Blob(["(", scriptFunction.toString(), ")()"], { type: "application/javascript" }));
}

function scriptFunction(this: IWorker) {
  const mcfusWorker = this;
  mcfusWorker.Domain = "";
  mcfusWorker.onmessage = (evt) => {
    if (evt.data.Domain) {
      mcfusWorker.Domain = evt.data.Domain;
      return;
    }

    if (!evt.data.Chunk) {
      return;
    }

    mcfusWorker.sendChunk(evt.data.Chunk, evt.data.ChunkNumber, evt.data.Url, evt.data.CorrelationId);
  };

  mcfusWorker.sendChunk = (chunk, chunkNumber, url, correlationId) => {
    //@ts-ignore
    //this check addresses a trailing zeros bug, where part of the chunk will be empty. Simply touching the size is enough to "fix" the problem
    const size = chunk.size;

    fetch(mcfusWorker.Domain + "/" + url, {
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
        mcfusWorker.postMessage({ Error: json.Error, ChunkNumber: chunkNumber });
      })
      .catch((error) => {
        mcfusWorker.postMessage({ Error: true, ChunkNumber: chunkNumber });
      });
  };
}

class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(statusText);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = status;
    this.statusText = statusText;
  }
}

export const McFusUploader = function (this: any, args: IInitializeSettings) {
  const maxWorkerAgeInSeconds = 40;
  let ambiguousProgress = 0;
  let progressUpdateRate = 0;
  const maxNumberOfConcurrentUploads = 10;

  const uploadBaseUrls = {
    CancelUpload: "upload/cancel/",
    RestartUrl: "upload/restart/",
    SetMetadata: "upload/set_metadata/",
    UploadChunk: "upload/upload_chunk/",
    UploadFinished: "upload/finished/",
    UploadStatus: "upload/status/",
  };

  const uploadData: IUploadData = {
    AssetId: "00000000-0000-0000-0000-000000000000",
    BlobPartitions: 0,
    CallbackUrl: "",
    CorrelationId: "00000000-0000-0000-0000-000000000000",
    CorrelationVector: "",
    ChunkSize: 0,
    LogToConsole: false,
    Tenant: "",
    UrlEncodedToken: "",
    TotalBlocks: 0,
    UploadDomain: "",
    Uploaders: 8,
    WorkerScript: "",
  };

  // Exposed for testing.
  this.uploadData = uploadData;

  const uploadStatus: IUploadStatus = {
    AutoRetryCount: 0,
    AverageSpeed: 0,
    BlocksCompleted: 0,
    ChunksFailedCount: 0,
    ChunkQueue: [],
    Connected: true,
    EndTime: new Date(),
    HealthCheckRunning: false,
    InflightChunks: [],
    InflightSet: new Set(),
    AbortController: new AbortController(),
    MaxErrorCount: 20,
    ServiceCallback: {
      AutoRetryCount: 5,
      AutoRetryDelay: 1,
      FailureCount: 0,
    },
    StartTime: new Date(),
    State: McFusUploadState.New,
    TransferQueueRate: [],
    UseSingleThreadUpload: false,
    Workers: [],
    WorkerErrorCount: 0,
  };

  // Exposed for testing.
  this.uploadStatus = uploadStatus;

  let mcworker: IWorker | null = null;

  this.mcworker = mcworker;
  const eventHandlers = {
    onProgressChanged: (progress: IProgress) => {},
    onCompleted: (uploadStats: IUploadStats) => {},
    onResumeRestart: (onResumeStartParams: IOnResumeStartParams) => {},
    onMessage: (message: string, properties: LogProperties, messageLevel: McFusMessageLevel) => {},
    onStateChanged: (state: McFusUploadState) => {},
  };

  function calculateAverageSpeed() {
    if (uploadStatus.TransferQueueRate.length === 0) {
      return 0;
    }

    let rateSum = 0;

    for (const transferQueueRate of uploadStatus.TransferQueueRate) {
      rateSum += transferQueueRate;
    }

    return rateSum / uploadStatus.TransferQueueRate.length;
  }

  function calculateRate() {
    // Get the elapsed time in seconds
    const diff = new Date().getTime() - uploadStatus.StartTime.getTime();
    const seconds = diff / 1000;

    // Megabytes per second
    const speed = (uploadStatus.BlocksCompleted * uploadData.ChunkSize) / 1024 / 1024 / seconds;

    // Times 8 to convert bits to bytes
    const rate = speed * 8;
    return rate;
  }

  function calculateTimeRemaining() {
    // calculate time remaining using chunks to avoid hitting the disc for size
    const dataRemaining = uploadStatus.ChunkQueue.length * uploadData.ChunkSize;
    if (uploadStatus.AverageSpeed > 0 && dataRemaining > 0) {
      let timeInSeconds = (dataRemaining * 8) / (1024 * 1024 * uploadStatus.AverageSpeed);
      const hours = Math.floor(timeInSeconds / 60 / 60);
      timeInSeconds -= hours * 60 * 60;
      return timeInSeconds;
    }

    return 0;
  }

  function completeUpload() {
    // Only raise the completed event if we've not done it before, this can happen
    // due to a race condition on status checks calling finishUpload simultaneously
    if (uploadStatus.State === McFusUploadState.Completed) {
      return;
    }

    const rate = calculateRate();
    const diff = uploadStatus.EndTime.getTime() - uploadStatus.StartTime.getTime();
    const seconds = diff / 1000;

    const uploadStats: IUploadStats = {
      AssetId: uploadData.AssetId,
      TotalTimeInSeconds: seconds.toFixed(1),
      AverageSpeedInMbps: rate,
    };

    setState(McFusUploadState.Completed);
    const completeMessage =
      "UploadCompleted: " +
      " Multithreaded: " +
      !useSingleThreadUploader() +
      " total time: " +
      uploadStats.TotalTimeInSeconds +
      " seconds. Average speed: " +
      uploadStats.AverageSpeedInMbps +
      " Mbps.";
    log(completeMessage, {
      UploadFileSize: uploadData.File!.size,
      UploadSpeed: uploadStats.AverageSpeedInMbps,
      ElapsedSeconds: uploadStats.TotalTimeInSeconds,
    });

    eventHandlers.onCompleted(uploadStats);
  }

  function dispatchWorker(worker: IWorker) {
    // if we are done then call finished and return
    if (uploadStatus.ChunkQueue.length === 0) {
      removeWorker(worker);
      log("Worker finished.");
      return;
    }

    // if we are not uploading chunks there is nothing to do.
    if (uploadStatus.State !== McFusUploadState.Uploading) {
      return;
    }

    const chunkToSend = uploadStatus.ChunkQueue.shift();

    // If other worker beat us to grab a chunk we're done
    if (chunkToSend === undefined) {
      return;
    }

    // Otherwise just start processing and uploading the chunk
    const start = (chunkToSend - 1) * uploadData.ChunkSize;
    const end = Math.min(chunkToSend * uploadData.ChunkSize, uploadData.File!.size);
    const chunk = uploadData.File!.slice(start, end);
    const url = `${uploadBaseUrls.UploadChunk}${uploadData.AssetId}?block_number=${chunkToSend}&token=${uploadData.UrlEncodedToken}`;

    // Don't request if chunk is empty
    if (!isValidChunk(chunk)) {
      return;
    }

    worker.postMessage({
      Chunk: chunk,
      ChunkNumber: chunkToSend,
      Url: url,
      CorrelationId: uploadData.CorrelationId,
      CorrelationVector: uploadData.CorrelationVector,
    });

    // Track the current chunk as in-flight.
    uploadStatus.InflightChunks.push(new InflightModelChunk(chunkToSend, worker));
  }

  function enqueueChunks(chunks: number[]) {
    // if the queue is empty then just add all the chunks
    if (uploadStatus.ChunkQueue.length === 0) {
      uploadStatus.ChunkQueue = chunks;
      return;
    }

    // if there something in the queue, don't re-add a chunk. This
    // can result in more than one thread uploading the same chunk
    uploadStatus.ChunkQueue = uploadStatus.ChunkQueue.concat(
      chunks.filter(function (chunk) {
        return uploadStatus.ChunkQueue.indexOf(chunk) < 0;
      })
    );
  }

  function error(errorMessage: string, properties: LogProperties = {}, errorCode?: McFusUploadState) {
    errorCode = errorCode || McFusUploadState.FatalError;
    setState(errorCode);
    properties.VerboseMessage = "Error Code: " + errorCode + " - " + errorMessage;
    log(errorMessage, properties, McFusMessageLevel.Error);
  }

  function finishUpload() {
    // Only verify the upload once at a time.
    if (uploadStatus.State === McFusUploadState.Verifying || uploadStatus.State === McFusUploadState.Completed) {
      return;
    }

    setState(McFusUploadState.Verifying);
    log("Verifying upload on server.");

    stopAllWorkers();

    sendRequest({
      type: "POST",
      useAuthentication: true,
      url:
        uploadBaseUrls.UploadFinished +
        encodeURIComponent(uploadData.AssetId) +
        "?callback=" +
        encodeURIComponent(uploadData.CallbackUrl),
      error: function (err) {
        log("Finalize upload failed. Trying to autorecover... " + err.message);
        setState(McFusUploadState.Uploading);
        healthCheck();
      },
      success: function (response) {
        // it's possible that the health check called complete before this method did.
        // Log the current status and proceed with response verification.
        if (uploadStatus.State !== McFusUploadState.Verifying) {
          log("Verifying: Upload status has changed, current status: " + uploadStatus.State);
        }

        //if no error then execute callback
        if (response.error === false && response.state === "Done") {
          log("UploadFinalized. McFus reported the upload as completed. Status message: " + response.message, {
            location: response.location,
          });

          // Finally report upload completion.
          completeUpload();

          // Attempt to perform a callback
          invokeCallback(response.raw_location);
        } else {
          // if chunks are missing enqueue missing chunks
          if (response.missing_chunks && response.missing_chunks.length > 0) {
            // If there are missing chunks lets adjust the completed count.
            uploadStatus.BlocksCompleted = uploadData.TotalBlocks - response.missing_chunks.length;

            enqueueChunks(response.missing_chunks);
            setState(McFusUploadState.Uploading);

            log("Finalizing found missing " + response.missing_chunks.length + " chunks. Requeuing chunks.", {
              ChunksMissing: response.missing_chunks,
            });

            if (useSingleThreadUploader()) {
              for (let i = 0; i < Math.min(maxNumberOfConcurrentUploads, uploadStatus.ChunkQueue.length); i++) {
                singleThreadedUpload();
              }
              return;
            }

            return;
          }

          // TODO: investigate if dead code.
          // if no chunks are missing this must be an unhandled error
          // display the details to the user and stop the upload.
          error(response.message);
        }
      },
    });
  }

  function formatAsDoubleDigit(number: number) {
    return number >= 0 && number < 10 ? "0" + number : number;
  }

  function hasRequiredSettings(settings: IRequiredSettings) {
    let hasSettings = true;

    if (!settings.AssetId) {
      hasSettings = false;
      error("An AssetId must be specified.");
    }

    if (!settings.UrlEncodedToken) {
      hasSettings = false;
      error("The upload UrlEncodedToken must be specified.");
    }

    if (!settings.UploadDomain) {
      hasSettings = false;
      error("The UploadDomain must be specified.");
    }

    if (!settings.Tenant) {
      hasSettings = false;
      error("The Tenant name must be specified.");
    }

    return hasSettings;
  }

  function healthCheck() {
    // Only allow one health check at a time.
    if (uploadStatus.HealthCheckRunning === true) {
      return;
    }

    if (useSingleThreadUploader()) {
      if (uploadStatus.Workers.length > 0) {
        stopAllWorkers();
      } else {
        setState(McFusUploadState.Uploading);
      }

      // Failing shows progress
      eventHandlers.onProgressChanged({ percentCompleted: ++ambiguousProgress, Rate: "", AverageSpeed: "", TimeRemaining: "" });
      log("Starting singleThreadedUpload with chunks: " + uploadStatus.ChunkQueue);
      for (let i = 0; i < Math.min(maxNumberOfConcurrentUploads, uploadStatus.ChunkQueue.length); i++) {
        singleThreadedUpload();
      }

      return;
    }

    uploadStatus.HealthCheckRunning = true;
    log("Health check: " + toTimeString(new Date()));

    // If the we are not uploading there's nothing to check.
    if (!isUploadInProgress()) {
      log("Upload is not in progress. Stopping health check.");
      uploadStatus.HealthCheckRunning = false;
      return;
    }

    // Look at the current queue and determine if there's pending work
    if (uploadStatus.ChunkQueue.length === 0 && uploadStatus.Workers.length === 0) {
      uploadStatus.EndTime = new Date();
      finishUpload();
    } else {
      // Calculate the current chunk age and see if it's considered as stale.
      const now = new Date();
      const stuckChunks: InflightModelChunk[] = [];

      for (const inflightChunk of uploadStatus.InflightChunks) {
        // If a chunk has exceeded its maximum time to live we assume it has
        // become stale, proceed to terminate it and create a replacement
        const ageInSeconds = (now.getTime() - inflightChunk.getStarted().getTime()) / 1000;
        if (ageInSeconds > maxWorkerAgeInSeconds) {
          stuckChunks.push(inflightChunk);
        }
      }

      if (stuckChunks.length > 0) {
        // Failing shows progress
        eventHandlers.onProgressChanged({ percentCompleted: ++ambiguousProgress, Rate: "", AverageSpeed: "", TimeRemaining: "" });
        for (const stuckChunk of stuckChunks) {
          // Keep track of the amount of replaced workers.
          uploadStatus.WorkerErrorCount++;

          removeInflightChunk(stuckChunk.getChunkNumber());
          enqueueChunks([stuckChunk.getChunkNumber()]);

          // Replace the stuck worker with a new one.
          removeWorker(stuckChunk.getWorker());
          startWorker();
        }
      }
    }

    if (uploadStatus.Workers.length === 0 && uploadStatus.ChunkQueue.length > 0) {
      initWorkers();
    }

    uploadStatus.HealthCheckRunning = false;
    setTimeout(healthCheck, 5 * 1000);
  }

  function hookupEventListeners(settings: IEventSettings) {
    eventHandlers.onProgressChanged = settings.onProgressChanged;
    eventHandlers.onCompleted = settings.onCompleted;
    eventHandlers.onResumeRestart = settings.onResumeRestart;
    eventHandlers.onMessage = settings.onMessage;
    eventHandlers.onStateChanged = settings.onStateChanged;
  }

  function initializeUpload(settings: IInitializeSettings) {
    // Validate required arguments if any
    // is missing the upload will fail.
    if (!hasRequiredSettings(settings)) {
      return;
    }

    // Validate optional arguments if not
    // provided we fallback to defaults.
    processOptionalSettings(settings);

    // Hookup all the event user defined event handlers.
    hookupEventListeners(settings);

    // Make sure browser supports all required features.
    if (!isClassesSupported()) {
      setState(McFusUploadState.Error);
    }

    // After all checks have completed finally proceed
    // to initialize all the upload required fields.
    setState(McFusUploadState.New);

    // Initialize all retry flags for the new upload.
    uploadStatus.AutoRetryCount = 3;
    uploadStatus.BlocksCompleted = 0;
    uploadStatus.ServiceCallback.AutoRetryCount = 5;
    uploadStatus.ServiceCallback.AutoRetryDelay = 1;
    uploadStatus.ServiceCallback.FailureCount = 0;
    uploadStatus.WorkerErrorCount = 0;
    uploadStatus.HealthCheckRunning = false;

    // Copy all the required settings on to the upload data.
    uploadData.AssetId = settings.AssetId;
    uploadData.UploadDomain = settings.UploadDomain;
    uploadData.UrlEncodedToken = settings.UrlEncodedToken;
    uploadData.Tenant = settings.Tenant;

    log("Upload created");
  }

  function initWorkers() {
    // Mark the current upload as in progress
    setState(McFusUploadState.Uploading);

    // Kill all existing workers (if any)
    if (uploadStatus.Workers.length > 0) {
      stopAllWorkers();
    }

    // Calculate the number of worker threads to use
    log("# of workers needed: " + uploadStatus.ChunkQueue.length);

    const numberOfWorkers = Math.min(uploadData.Uploaders, uploadStatus.ChunkQueue.length);
    for (let i = 0; i < numberOfWorkers; i++) {
      // Stagger worker creation to avoid startup contention
      startWorker();
    }
  }

  function invokeCallback(location: string) {
    if (uploadData.CallbackUrl && uploadData.CallbackUrl !== "") {
      const callbackUrl =
        uploadData.CallbackUrl +
        "/" +
        encodeURIComponent(uploadData.AssetId) +
        "?file_name=" +
        encodeURIComponent(uploadData.File!.name) +
        "&file_size=" +
        encodeURIComponent(uploadData.File!.size) +
        "&location=" +
        location;
      log("Callback was supplied. Invoking callback on: " + callbackUrl);

      sendRequest({
        type: "POST",
        url: callbackUrl,
        useBaseDomain: false,
        useAuthentication: false,
        error: function (err) {
          const errorMessage = "Callback failed. Status: " + err.message;

          // Non-fatal error, just log info
          log(errorMessage, { FailedCallback: uploadData.CallbackUrl });

          // If we still have retries available go ahead with the success callback.
          if (uploadStatus.ServiceCallback.AutoRetryCount > 0) {
            setTimeout(function () {
              invokeCallback(location);
            }, uploadStatus.ServiceCallback.AutoRetryDelay * 10);

            uploadStatus.ServiceCallback.AutoRetryCount--;
            uploadStatus.ServiceCallback.FailureCount++;

            // Increment the backoff in multiples of 5 for
            // subsequent attempts. (5, 25, 125 and so on)
            uploadStatus.ServiceCallback.AutoRetryDelay *= 5;
          } else {
            log(
              "Callback retries depleted. The upload completed but the uploader was unable to perform a successful callback notifying completion."
            );
          }
        },
        success: function () {
          log("Callback succeeded.");
        },
      });
    }
  }

  function isNodeEnvironment() {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
  }

  function isClassesSupported() {

    // Check if the current platform isn't a browser.
    if (isNodeEnvironment()) {
      return true;
    }

    // Setup default value.
    let isSupported = true;

    // Detect browser support for web workers.
    if (typeof Worker === "undefined") {
      error("Browser does not support web workers", {}, McFusUploadState.Error);
      isSupported = false;
    }

    // Detect browser support for file API.
    if (typeof window.File === "undefined") {
      error("Browser does not support the html 5 file api.", {}, McFusUploadState.Error);
      isSupported = false;
    }
    return isSupported;
  }

  function isUploadInProgress() {
    return (
      uploadStatus.State === McFusUploadState.Initialized ||
      uploadStatus.State === McFusUploadState.Uploading ||
      uploadStatus.State === McFusUploadState.Verifying
    );
  }

  function isValidChunk(chunk: Blob | Buffer): boolean {
    if (!chunk) {
      return false;
    }
    if (!isNodeEnvironment() && chunk instanceof Blob && (chunk as Blob).size === 0) {
      return false;
    }
    if (chunk instanceof Buffer && (chunk as Buffer).length === 0) {
      return false;
    }
    return true;
  }

  function log(message: string, properties: LogProperties = {}, level: McFusMessageLevel = McFusMessageLevel.Information) {
    properties.VerboseMessage = "mc-fus-uploader - " + (properties.VerboseMessage ? properties.VerboseMessage : message);
    properties = getLoggingProperties(properties);
    if (window.console && uploadData.LogToConsole === true) {
      if (level === McFusMessageLevel.Error) {
        console.error(message, properties, level);
      } else {
        console.log(message, properties, level);
      }
    }

    eventHandlers.onMessage(message, properties, level);
  }

  function processOptionalSettings(settings: IOptionalSettings) {
    uploadData.CallbackUrl = settings.CallbackUrl ? decodeURI(settings.CallbackUrl) : "";
    uploadData.CorrelationId = settings.CorrelationId || settings.AssetId;
    uploadData.CorrelationVector = settings.CorrelationVector || "";
    uploadData.LogToConsole = settings.LogToConsole || false;
    uploadData.Uploaders = settings.Uploaders || 8;
    uploadData.WorkerScript = settings.WorkerScript || "/js/worker.js";
  }

  function removeInflightChunk(chunkNumber: number) {
    for (let i = 0; i < uploadStatus.InflightChunks.length; i++) {
      if (uploadStatus.InflightChunks[i].getChunkNumber() === chunkNumber) {
        uploadStatus.InflightChunks.splice(i, 1);
        break;
      }
    }
  }

  function removeWorker(worker: IWorker) {
    for (let i = 0; i < uploadStatus.Workers.length; i++) {
      if (worker === uploadStatus.Workers[i]) {
        worker.terminate();
        uploadStatus.Workers.splice(i, 1);
        break;
      }
    }
  }

  function reportProgress() {
    let percentCompleted = (uploadStatus.BlocksCompleted * 100) / uploadData.TotalBlocks;

    // Since workers that are on async processes can't be aborted there is a chance
    // that a chunk will be inflight and account as missing so when it gets resent
    // it will get accounted twice, since accounting for inflight chunks on the percentage
    // calculation is not reliable if we go over 100 we'll just mark it as 99.99.
    if (percentCompleted > 100) {
      percentCompleted = 99;
    }
    ambiguousProgress = Math.max(ambiguousProgress, percentCompleted);

    const rate = calculateRate();
    uploadStatus.TransferQueueRate.push(rate);

    if (uploadStatus.TransferQueueRate.length > 100) {
      uploadStatus.TransferQueueRate.shift();
    }

    uploadStatus.AverageSpeed = calculateAverageSpeed();

    const progress: IProgress = {
      percentCompleted: percentCompleted,
      Rate: rate.toFixed(2),
      AverageSpeed: uploadStatus.AverageSpeed.toFixed(0),
      TimeRemaining: calculateTimeRemaining().toFixed(0),
    };

    eventHandlers.onProgressChanged(progress);
  }

  function sendRequest(requestOptions) {
    // Check if the caller specifies a fully qualified url
    // or if it needs the McFus base domain to be appended.
    let requestUrl;
    if (requestOptions.useBaseDomain === false) {
      requestUrl = requestOptions.url;
    } else {
      requestUrl = uploadData.UploadDomain + "/" + requestOptions.url;
    }

    // All the call requires auth then we add the McFus token
    if (requestOptions.useAuthentication && requestOptions.useAuthentication === true) {
      if (requestUrl.indexOf("?") > 0) {
        requestUrl += "&";
      } else {
        requestUrl += "?";
      }
      requestUrl += `token=${uploadData.UrlEncodedToken}`;
    }

    // If cache is disabled we add a timestamp to the url.
    if (requestOptions.cache !== undefined && requestOptions.cache === false) {
      requestUrl += "&_=" + new Date().getTime();
    }
    let body;
    if (requestOptions.chunk) {
      // @ts-ignore
      // this check addresses a trailing zeros bug, where part of the chunk will be empty. Simply touching the size is enough to "fix" the problem
      const size = requestOptions.chunk.size;
      body = requestOptions.chunk;
    }
    fetch(requestUrl, {
      method: requestOptions.type,
      headers: {
        "X-Correlation-ID": uploadData.CorrelationId,
      },
      body: body,
      signal: uploadStatus.AbortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new HttpError(response.status, response.statusText);
        }
        return response.json().catch((error) => {
          throw new HttpError(response.status, error);
        });
      })
      .then((json) => {
        if (requestOptions.success) {
          requestOptions.success(json);
        }
      })
      .catch((error) => {
        // Any other status code or if the page has markup it is
        // considered as failed and invokes to the error callback.
        if (requestOptions.error) {
          requestOptions.error(error);
        }
      });
  }

  function setMetadata() {
    eventHandlers.onProgressChanged({ percentCompleted: ++ambiguousProgress, Rate: "", AverageSpeed: "", TimeRemaining: "" });
    const logProperties = {
      fileName: uploadData.File!.name,
      fileSize: uploadData.File!.size,
    };
    log("Setting Metadata.", logProperties);
    const fileExt = uploadData.File!.name.split(".").pop() as string;
    const mimeTypeParam = MimeTypes[fileExt] ? `&content_type=${encodeURIComponent(MimeTypes[fileExt])}` : ``;

    sendRequest({
      type: "POST",
      useAuthentication: true,
      url:
        uploadBaseUrls.SetMetadata +
        encodeURIComponent(uploadData.AssetId) +
        "?file_name=" +
        encodeURIComponent(uploadData.File!.name) +
        "&file_size=" +
        encodeURIComponent(uploadData.File!.size) +
        mimeTypeParam,
      error: function (err) {
        if (err instanceof HttpError) {
          Object.assign(logProperties, {
            StatusCode: err.status,
            StatusText: err.statusText,
          });
          error("The asset cannot be uploaded. Try creating a new one.", logProperties);
        } else {
          error("Upload Failed. No network detected. Please try again.", {}, McFusUploadState.Error);
        }
      },
      success: function (response) {
        eventHandlers.onProgressChanged({ percentCompleted: ++ambiguousProgress, Rate: "", AverageSpeed: "", TimeRemaining: "" });
        // if we get an html document back we likely have a server error so report it and stop
        if (response.error === undefined && response.toString().indexOf("<!DOCTYPE html>") === 0) {
          //strip off everything outside the body tags
          const body = response.replace(/^[\S\s]*<body[^>]*?>/i, "").replace(/<\/body[\S\s]*$/i, "");
          error(body);
          return;
        }

        // Probably dead code - unable to return error body for 200 status code
        if (response.error) {
          Object.assign(logProperties, {
            StatusCode: response.currentTarget.status,
            StatusText: response.currentTarget.statusText,
          });
          error(response.message, logProperties);
          return;
        }

        Object.assign(logProperties, { serverLocation: response.server_location, chunkSize: response.chunk_size });
        log("Set metadata completed.", logProperties);
        uploadData.ChunkSize = response.chunk_size;
        uploadData.BlobPartitions = response.blob_partitions;

        // Calculate the number of chunks to send
        uploadData.TotalBlocks = Math.ceil(uploadData.File!.size / uploadData.ChunkSize);
        progressUpdateRate = Math.ceil(uploadData.TotalBlocks / 100);
        log("Chunks to upload: " + uploadData.TotalBlocks);

        enqueueChunks(response.chunk_list);

        // Handle the restart/resume/recovery scenario
        if (response.resume_restart) {
          setState(McFusUploadState.ResumeOrRestart);
          const remainingChunksToUpload = response.chunk_list.length;
          log("Chunks remaining to upload: " + remainingChunksToUpload);

          uploadStatus.BlocksCompleted = uploadData.TotalBlocks - remainingChunksToUpload;
          eventHandlers.onResumeRestart({ NumberOfChunksRemaining: remainingChunksToUpload });
        } else {
          uploadStatus.BlocksCompleted = 0;
          uploadStatus.StartTime = new Date();
          healthCheck();
        }
      },
    });
  }

  function setState(state: McFusUploadState) {
    uploadStatus.State = state;
    log("Setting state: " + state);
    eventHandlers.onStateChanged(state);
  }

  this.setWorker = function setWorker(worker: IWorker) {
    mcworker = worker;
  };

  this.getScript = function getScript() {
    return "(" + scriptFunction.toString() + ")()";
  };

  function setupWorker() {
    let worker: IWorker | null = null;
    try {
      // log("Browser cannot create workers from blob. Falling back to single thread upload.");
      uploadStatus.UseSingleThreadUpload = true;
      return;
      worker = new WorkerNode(__dirname + "/release-worker.js");
    } catch (err) {
      // Current versions of Safari won't allow the blob script.
      log("Browser cannot create workers from blob. Falling back to single thread upload.");
      uploadStatus.UseSingleThreadUpload = true;
      return;
    }
    worker!.postMessage({ Domain: uploadData.UploadDomain });

    worker!.onmessage = function (msg: any) {
      const { ChunkNumber, Error } = isNodeEnvironment() ? msg : msg.data;
      if (Error === true) {
        // Keep track of the amount of replaced workers.
        uploadStatus.WorkerErrorCount++;

        // The chunk was not uploaded successfully
        // get it back on the queue for retry
        enqueueChunks([ChunkNumber]);
        log("Upload for chunk #: " + ChunkNumber + " failed and will be retried.");
      } else {
        removeInflightChunk(ChunkNumber);
        // Successful upload, mark completion and discard the chunk.
        uploadStatus.BlocksCompleted++;
        if (uploadStatus.BlocksCompleted % progressUpdateRate === 0) {
          reportProgress();
        }
      }

      // Dispatch the worker instance again to keep processing
      dispatchWorker(worker!);
    };

    worker!.onerror = function () {
      //chunk data is lost, as is chunk number, relying on the finalize to catch this
      log("Worker crashed. Recovering...");

      // Dispatch the worker instance again to keep processing
      dispatchWorker(worker!);
    };

    return worker;
  }

  function singleThreadedUpload() {
    if (uploadStatus.ChunkQueue.length === 0 && uploadStatus.InflightSet.size === 0) {
      uploadStatus.EndTime = new Date();
      finishUpload();
      return;
    }

    if (uploadStatus.ChunksFailedCount > uploadStatus.MaxErrorCount) {
      if (uploadStatus.State === McFusUploadState.Uploading) {
        // Treat client disconnect errors as non-fatal errors as a service health indicator.
        if (uploadStatus.Connected) {
          error("Upload Failed. Encountered too many errors while uploading. Please try again.");
        } else {
          error("Upload Failed. No network detected. Please try again.", {}, McFusUploadState.Error);
        }
      }
      // Cancel any single threaded operations.
      abortSingleThreadedUploads();
      return;
    }

    const chunkNumber = uploadStatus.ChunkQueue.pop();

    // Safety check in case the queue got emptied before or is still in flight.
    if (chunkNumber === undefined || uploadStatus.InflightSet.has(chunkNumber)) {
      return;
    }

    // Otherwise just start processing and uploading the chunk
    const start = (chunkNumber - 1) * uploadData.ChunkSize;
    const end = Math.min(chunkNumber * uploadData.ChunkSize, uploadData.File!.size);
    const chunk = uploadData.File!.slice(start, end);

    // Don't request if chunk is empty or in the wrong state
    if (!isValidChunk(chunk) || uploadStatus.State !== McFusUploadState.Uploading) {
      return;
    }

    uploadChunk(chunk, chunkNumber);
  }

  function startWorker() {
    setTimeout(function () {
      const worker = setupWorker();
      if (!worker) {
        return;
      }

      // add the new worker to the pool
      uploadStatus.Workers.push(worker);

      log("Worker started at: " + toTimeString(new Date()));

      // start the upload process on the worker
      dispatchWorker(worker);
    }, 20);
  }

  function stopAllWorkers() {
    log("Stopping all workers.");

    // Tell all workers to abort their calls and close.
    for (const worker of uploadStatus.Workers) {
      worker.terminate();
    }

    // Once all workers have stopped lets reset the collection.
    enqueueChunks(uploadStatus.InflightChunks.map((chunk) => chunk.getChunkNumber()));
    uploadStatus.Workers = [];
    uploadStatus.InflightChunks = [];
  }

  function abortSingleThreadedUploads() {
    uploadStatus.AbortController.abort();
  }

  function toTimeString(date: Date) {
    return (
      formatAsDoubleDigit(date.getHours()) +
      ":" +
      formatAsDoubleDigit(date.getMinutes()) +
      ":" +
      formatAsDoubleDigit(date.getSeconds()) +
      "." +
      formatAsDoubleDigit(date.getMilliseconds())
    );
  }

  function getLoggingProperties(data: LogProperties) {
    const properties = {
      AssetId: uploadData.AssetId,
      CorrelationId: uploadData.CorrelationId,
      Tenant: uploadData.Tenant,
    };
    Object.assign(properties, data);
    return properties;
  }

  function uploadChunk(chunk: Blob | Buffer, chunkNumber: number) {
    uploadStatus.InflightSet.add(chunkNumber);
    log("Starting upload for chunk: " + chunkNumber);
    sendRequest({
      type: "POST",
      useAuthentication: true,
      chunk: chunk,
      url: uploadBaseUrls.UploadChunk + encodeURIComponent(uploadData.AssetId) + "?block_number=" + chunkNumber,
      error: function (err) {
        uploadStatus.InflightSet.delete(chunkNumber);
        uploadChunkErrorHandler(err, chunkNumber);
      },
      success: function (response) {
        uploadStatus.InflightSet.delete(chunkNumber);
        if (response.error) {
          uploadChunkErrorHandler(response.error, chunkNumber);
          return;
        } else {
          // If a user is struggling to upload, we can increase the MaxErrorCount on each success in order to keep trying while they are making some progress.
          ++uploadStatus.MaxErrorCount;
          uploadStatus.Connected = true;
          log("ChunkSucceeded: " + chunkNumber + ".");
          if (++uploadStatus.BlocksCompleted % progressUpdateRate === 0) {
            reportProgress();
          }
        }

        singleThreadedUpload();
      },
    });
  }

  function uploadChunkErrorHandler(error, chunkNumber: number) {
    ++uploadStatus.ChunksFailedCount;
    uploadStatus.ChunkQueue.push(chunkNumber);
    if (error instanceof HttpError) {
      log("ChunkFailed: " + chunkNumber + ".", {
        StatusCode: error.status,
        StatusText: error.statusText,
      });
      uploadStatus.Connected = true;
      singleThreadedUpload();
    } else {
      // If the user has gone offline, use a timeout for retrying instead
      log("ChunkFailed: " + chunkNumber + ": " + error.message);
      uploadStatus.Connected = false;
      log("No network detected. Attempting chunk upload again in 10s.");
      setTimeout(() => {
        singleThreadedUpload();
      }, 1000 * 10 /* 10 seconds */);
    }
  }

  function useSingleThreadUploader() {
    // The uploader switches to single threaded under these conditions:
    // 1. The browser is incompatible.
    // 2. The upload has recovered too many workers.
    // 3. Node version do not support workers.
    return (
      (window && window.navigator && window.navigator.userAgent.indexOf("Edge") > -1) ||
      uploadStatus.WorkerErrorCount > uploadStatus.MaxErrorCount ||
      uploadStatus.UseSingleThreadUpload
      // (isNodeEnvironment() && !mcworker)
    );
  }

  this.Start = function (file: McFusFile) {
    if (!file || file.size <= 0) {
      error("A file must be specified and must not be empty.", {}, McFusUploadState.Error);
      return;
    }

    if (isUploadInProgress()) {
      // Non fatal error. Introducing a warning level is an API breaking change in portal. error() changes state.
      log("Cannot start an upload that is already in progress.", undefined, McFusMessageLevel.Error);
      return;
    }

    uploadData.File = file;
    setState(McFusUploadState.Initialized);
    setMetadata();
  };

  this.Restart = function () {
    log("UploadRestarted");

    sendRequest({
      type: "POST",
      useAuthentication: true,
      url: uploadBaseUrls.RestartUrl + encodeURIComponent(uploadData.AssetId),
      success: function (response) {
        if (response.error) {
          error(response.message);
          return;
        }

        setState(McFusUploadState.Uploading);
        uploadStatus.StartTime = new Date();
        healthCheck();
      },
    });
  };

  this.Pause = function () {
    if (!isUploadInProgress()) {
      error("Cannot pause an upload that is not in progress.");
      return;
    }

    log("UploadPaused");
    setState(McFusUploadState.Paused);
  };

  this.Continue = function () {
    if (uploadStatus.State !== McFusUploadState.Paused) {
      error("Cannot resume and upload that is not paused.");
      return;
    }

    log("UploadContinued");

    setState(McFusUploadState.Uploading);

    for (const worker of uploadStatus.Workers) {
      dispatchWorker(worker);
    }

    healthCheck();
  };

  this.Cancel = function () {
    log("UploadCancelled");

    sendRequest({
      type: "POST",
      useAuthentication: true,
      url: uploadBaseUrls.CancelUpload + encodeURIComponent(uploadData.AssetId),
      success: function (response) {
        log(response.message);
        setState(McFusUploadState.Cancelled);

        stopAllWorkers();
        abortSingleThreadedUploads();
      },
    });
  };

  this.Reset = function (settings: IInitializeSettings) {
    initializeUpload(settings);
  };

  initializeUpload(args);
};

import {
  IUploadData,
  IUploadStatus,
  McFusUploadState,
  IProgress,
  IUploadStats,
  McFusMessageLevel,
  McFusUploader,
  IRequiredSettings,
  IEventSettings,
  IInitializeSettings,
  IOptionalSettings,
  IOnResumeStartParams,
  McFusFile,
  LogProperties,
} from "./mc-fus-uploader-types";
import * as fs from "fs";
import fetch from "node-fetch";
import { MimeTypes } from "./mc-fus-mime-types";
import * as Path from "path";
import "abort-controller/polyfill";

export class McFile implements McFusFile {
  private path: string;

  public constructor(path: string) {
    this.path = path;
  }

  get size(): number {
    const stats = fs.statSync(this.path);
    return stats["size"];
  }

  get name(): string {
    return Path.basename(this.path);
  }

  slice(start: number, end: number): Buffer {
    const data = Buffer.alloc(end - start);
    const fd = fs.openSync(this.path, "r");
    fs.readSync(fd, data, 0, data.length, start);
    return data;
  }
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

export class McFusNodeUploader implements McFusUploader {
  ambiguousProgress: number = 0;
  progressUpdateRate: number = 0;
  maxNumberOfConcurrentUploads: number = 10;

  readonly uploadBaseUrls: any = {
    CancelUpload: "upload/cancel/",
    SetMetadata: "upload/set_metadata/",
    UploadChunk: "upload/upload_chunk/",
    UploadFinished: "upload/finished/",
    UploadStatus: "upload/status/",
  };

  readonly uploadData: IUploadData = {
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
  };

  readonly uploadStatus: IUploadStatus = {
    AutoRetryCount: 0,
    AverageSpeed: 0,
    BlocksCompleted: 0,
    ChunksFailedCount: 0,
    ChunkQueue: [],
    Connected: true,
    EndTime: new Date(),
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
  };

  readonly eventHandlers: any = {
    onProgressChanged: (progress: IProgress) => {},
    onCompleted: (uploadStats: IUploadStats) => {},
    onResumeRestart: (onResumeStartParams: IOnResumeStartParams) => {},
    onMessage: (message: string, properties: LogProperties, messageLevel: McFusMessageLevel) => {},
    onStateChanged: (state: McFusUploadState) => {},
  };

  constructor(args: IInitializeSettings) {
    this.initializeUpload(args);
  }

  calculateAverageSpeed() {
    if (this.uploadStatus.TransferQueueRate.length === 0) {
      return 0;
    }

    let rateSum = 0;

    for (const transferQueueRate of this.uploadStatus.TransferQueueRate) {
      rateSum += transferQueueRate;
    }

    return rateSum / this.uploadStatus.TransferQueueRate.length;
  }

  calculateRate() {
    // Get the elapsed time in seconds
    const diff = new Date().getTime() - this.uploadStatus.StartTime.getTime();
    const seconds = diff / 1000;

    // Megabytes per second
    const speed = (this.uploadStatus.BlocksCompleted * this.uploadData.ChunkSize) / 1024 / 1024 / seconds;

    // Times 8 to convert bytes to bits
    const rate = speed * 8;
    return rate;
  }

  calculateTimeRemaining() {
    // calculate time remaining using chunks to avoid hitting the disc for size
    const dataRemaining = this.uploadStatus.ChunkQueue.length * this.uploadData.ChunkSize;
    if (this.uploadStatus.AverageSpeed > 0 && dataRemaining > 0) {
      let timeInSeconds = (dataRemaining * 8) / (1024 * 1024 * this.uploadStatus.AverageSpeed);
      const hours = Math.floor(timeInSeconds / 60 / 60);
      timeInSeconds -= hours * 60 * 60;
      return timeInSeconds;
    }

    return 0;
  }

  completeUpload() {
    // Only raise the completed event if we've not done it before, this can happen
    // due to a race condition on status checks calling finishUpload simultaneously
    if (this.uploadStatus.State === McFusUploadState.Completed) {
      return;
    }

    const rate = this.calculateRate();
    const diff = this.uploadStatus.EndTime.getTime() - this.uploadStatus.StartTime.getTime();
    const seconds = diff / 1000;

    const uploadStats: IUploadStats = {
      AssetId: this.uploadData.AssetId,
      TotalTimeInSeconds: seconds.toFixed(1),
      AverageSpeedInMbps: rate,
    };

    this.setState(McFusUploadState.Completed);
    const completeMessage =
      "UploadCompleted: " +
      " total time: " +
      uploadStats.TotalTimeInSeconds +
      " seconds. Average speed: " +
      uploadStats.AverageSpeedInMbps +
      " Mbps.";
    this.log(completeMessage, {
      UploadFileSize: this.uploadData.File!.size,
      UploadSpeed: uploadStats.AverageSpeedInMbps,
      ElapsedSeconds: uploadStats.TotalTimeInSeconds,
    });

    this.eventHandlers.onCompleted(uploadStats);
  }

  enqueueChunks(chunks: number[]) {
    // if the queue is empty then just add all the chunks
    if (this.uploadStatus.ChunkQueue.length === 0) {
      this.uploadStatus.ChunkQueue = chunks;
      return;
    }

    // if there something in the queue, don't re-add a chunk. This
    // can result in more than one thread uploading the same chunk
    this.uploadStatus.ChunkQueue = this.uploadStatus.ChunkQueue.concat(
      chunks.filter(function (chunk) {
        return this.uploadStatus.ChunkQueue.indexOf(chunk) < 0;
      })
    );
  }

  error(errorMessage: string, properties: LogProperties = {}, errorCode?: McFusUploadState) {
    errorCode = errorCode || McFusUploadState.FatalError;
    this.setState(errorCode);
    properties.VerboseMessage = "Error Code: " + errorCode + " - " + errorMessage;
    this.log(errorMessage, properties, McFusMessageLevel.Error);
  }

  finishUpload() {
    // Only verify the upload once at a time.
    if (this.uploadStatus.State === McFusUploadState.Verifying || this.uploadStatus.State === McFusUploadState.Completed) {
      return;
    }

    this.setState(McFusUploadState.Verifying);
    this.log("Verifying upload on server.");
    const self = this;
    this.sendRequest({
      type: "POST",
      useAuthentication: true,
      url:
        self.uploadBaseUrls.UploadFinished +
        encodeURIComponent(self.uploadData.AssetId) +
        "?callback=" +
        encodeURIComponent(self.uploadData.CallbackUrl),
      error: function (err: Error) {
        self.log("Finalize upload failed. Trying to autorecover... " + err.message);
        self.setState(McFusUploadState.Uploading);
        self.startUpload();
      },
      success: function (response: any) {
        // it's possible that the health check called complete before this method did.
        // Log the current status and proceed with response verification.
        if (self.uploadStatus.State !== McFusUploadState.Verifying) {
          self.log("Verifying: Upload status has changed, current status: " + self.uploadStatus.State);
        }

        //if no error then execute callback
        if (response.error === false && response.state === "Done") {
          self.log("UploadFinalized. McFus reported the upload as completed. Status message: " + response.message, {
            location: response.location,
          });

          // Finally report upload completion.
          self.completeUpload();

          // Attempt to perform a callback
          self.invokeCallback(response.raw_location);
        } else {
          // if chunks are missing enqueue missing chunks
          if (response.missing_chunks && response.missing_chunks.length > 0) {
            // If there are missing chunks lets adjust the completed count.
            self.uploadStatus.BlocksCompleted = self.uploadData.TotalBlocks - response.missing_chunks.length;

            self.enqueueChunks(response.missing_chunks);
            self.setState(McFusUploadState.Uploading);

            self.log("Finalizing found missing " + response.missing_chunks.length + " chunks. Requeuing chunks.", {
              ChunksMissing: response.missing_chunks,
            });

            const concurrentUploads = Math.min(self.maxNumberOfConcurrentUploads, self.uploadStatus.ChunkQueue.length);
            for (let i = 0; i < concurrentUploads; i++) {
              self.singleThreadedUpload();
            }
            return;
          }

          // if no chunks are missing this must be an unhandled error
          // display the details to the user and stop the upload.
          self.error(response.message);
        }
      },
    });
  }

  hasRequiredSettings(settings: IRequiredSettings) {
    let hasSettings = true;

    if (!settings.AssetId) {
      hasSettings = false;
      this.error("An AssetId must be specified.");
    }

    if (!settings.UrlEncodedToken) {
      hasSettings = false;
      this.error("The upload UrlEncodedToken must be specified.");
    }

    if (!settings.UploadDomain) {
      hasSettings = false;
      this.error("The UploadDomain must be specified.");
    }

    if (!settings.Tenant) {
      hasSettings = false;
      this.error("The Tenant name must be specified.");
    }

    return hasSettings;
  }

  startUpload() {
    this.setState(McFusUploadState.Uploading);

    // Failing shows progress
    this.eventHandlers.onProgressChanged({
      percentCompleted: ++this.ambiguousProgress,
      Rate: "",
      AverageSpeed: "",
      TimeRemaining: "",
    });
    this.log("Starting singleThreadedUpload with chunks: " + this.uploadStatus.ChunkQueue);
    const concurrentUploads = Math.min(this.maxNumberOfConcurrentUploads, this.uploadStatus.ChunkQueue.length);
    for (let i = 0; i < concurrentUploads; i++) {
      this.singleThreadedUpload();
    }
  }

  hookupEventListeners(settings: IEventSettings) {
    this.eventHandlers.onProgressChanged = settings.onProgressChanged;
    this.eventHandlers.onCompleted = settings.onCompleted;
    this.eventHandlers.onResumeRestart = settings.onResumeRestart;
    this.eventHandlers.onMessage = settings.onMessage;
    this.eventHandlers.onStateChanged = settings.onStateChanged;
  }

  initializeUpload(settings: IInitializeSettings) {
    // Validate required arguments if any
    // is missing the upload will fail.
    if (!this.hasRequiredSettings(settings)) {
      return;
    }

    // Validate optional arguments if not
    // provided we fallback to defaults.
    this.processOptionalSettings(settings);

    // Hookup all the event user defined event handlers.
    this.hookupEventListeners(settings);

    // After all checks have completed finally proceed
    // to initialize all the upload required fields.
    this.setState(McFusUploadState.New);

    // Initialize all retry flags for the new upload.
    this.uploadStatus.AutoRetryCount = 3;
    this.uploadStatus.BlocksCompleted = 0;
    this.uploadStatus.ServiceCallback.AutoRetryCount = 5;
    this.uploadStatus.ServiceCallback.AutoRetryDelay = 1;
    this.uploadStatus.ServiceCallback.FailureCount = 0;

    // Copy all the required settings on to the upload data.
    this.uploadData.AssetId = settings.AssetId;
    this.uploadData.UploadDomain = settings.UploadDomain;
    this.uploadData.UrlEncodedToken = settings.UrlEncodedToken;
    this.uploadData.Tenant = settings.Tenant;

    this.log("Upload created");
  }

  invokeCallback(location: string) {
    if (this.uploadData.CallbackUrl && this.uploadData.CallbackUrl !== "") {
      const callbackUrl =
        this.uploadData.CallbackUrl +
        "/" +
        encodeURIComponent(this.uploadData.AssetId) +
        "?file_name=" +
        encodeURIComponent(this.uploadData.File!.name) +
        "&file_size=" +
        encodeURIComponent(this.uploadData.File!.size) +
        "&location=" +
        location;
      this.log("Callback was supplied. Invoking callback on: " + callbackUrl);
      const self = this;
      this.sendRequest({
        type: "POST",
        url: callbackUrl,
        useBaseDomain: false,
        useAuthentication: false,
        error: function (err: Error) {
          const errorMessage = "Callback failed. Status: " + err.message;

          // Non-fatal error, just log info
          self.log(errorMessage, { FailedCallback: self.uploadData.CallbackUrl });

          // If we still have retries available go ahead with the success callback.
          if (self.uploadStatus.ServiceCallback.AutoRetryCount > 0) {
            setTimeout(function () {
              self.invokeCallback(location);
            }, self.uploadStatus.ServiceCallback.AutoRetryDelay * 10);

            self.uploadStatus.ServiceCallback.AutoRetryCount--;
            self.uploadStatus.ServiceCallback.FailureCount++;

            // Increment the backoff in multiples of 5 for
            // subsequent attempts. (5, 25, 125 and so on)
            self.uploadStatus.ServiceCallback.AutoRetryDelay *= 5;
          } else {
            self.log(
              "Callback retries depleted. The upload completed but the uploader was unable to perform a successful callback notifying completion."
            );
          }
        },
        success: function () {
          self.log("Callback succeeded.");
        },
      });
    }
  }

  isUploadInProgress() {
    return (
      this.uploadStatus.State === McFusUploadState.Initialized ||
      this.uploadStatus.State === McFusUploadState.Uploading ||
      this.uploadStatus.State === McFusUploadState.Verifying
    );
  }

  isValidChunk(chunk: Buffer): boolean {
    return chunk && chunk.length > 0;
  }

  log(message: string, properties: LogProperties = {}, level: McFusMessageLevel = McFusMessageLevel.Information) {
    properties.VerboseMessage = "mc-fus-uploader - " + (properties.VerboseMessage ? properties.VerboseMessage : message);
    properties = this.getLoggingProperties(properties);
    this.eventHandlers.onMessage(message, properties, level);
  }

  processOptionalSettings(settings: IOptionalSettings) {
    this.uploadData.CallbackUrl = settings.CallbackUrl ? decodeURI(settings.CallbackUrl) : "";
    this.uploadData.CorrelationId = settings.CorrelationId || settings.AssetId;
    this.uploadData.CorrelationVector = settings.CorrelationVector || "";
    this.uploadData.LogToConsole = settings.LogToConsole || false;
  }

  reportProgress() {
    let percentCompleted = (this.uploadStatus.BlocksCompleted * 100) / this.uploadData.TotalBlocks;

    // Since workers that are on async processes can't be aborted there is a chance
    // that a chunk will be inflight and account as missing so when it gets resent
    // it will get accounted twice, since accounting for inflight chunks on the percentage
    // calculation is not reliable if we go over 100 we'll just mark it as 99.99.
    if (percentCompleted > 100) {
      percentCompleted = 99;
    }
    this.ambiguousProgress = Math.max(this.ambiguousProgress, percentCompleted);

    const rate = this.calculateRate();
    this.uploadStatus.TransferQueueRate.push(rate);

    if (this.uploadStatus.TransferQueueRate.length > 100) {
      this.uploadStatus.TransferQueueRate.shift();
    }

    this.uploadStatus.AverageSpeed = this.calculateAverageSpeed();

    const progress: IProgress = {
      percentCompleted: percentCompleted,
      Rate: rate.toFixed(2),
      AverageSpeed: this.uploadStatus.AverageSpeed.toFixed(0),
      TimeRemaining: this.calculateTimeRemaining().toFixed(0),
    };

    this.eventHandlers.onProgressChanged(progress);
  }

  sendRequest(requestOptions: any) {
    // Check if the caller specifies a fully qualified url
    // or if it needs the McFus base domain to be appended.
    let requestUrl;
    if (requestOptions.useBaseDomain === false) {
      requestUrl = requestOptions.url;
    } else {
      requestUrl = this.uploadData.UploadDomain + "/" + requestOptions.url;
    }

    // All the call requires auth then we add the McFus token
    if (requestOptions.useAuthentication && requestOptions.useAuthentication === true) {
      if (requestUrl.indexOf("?") > 0) {
        requestUrl += "&";
      } else {
        requestUrl += "?";
      }
      requestUrl += `token=${this.uploadData.UrlEncodedToken}`;
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
    const self = this;
    fetch(requestUrl, {
      method: requestOptions.type,
      headers: {
        "X-Correlation-ID": self.uploadData.CorrelationId,
      },
      body: body,
      signal: self.uploadStatus.AbortController.signal,
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

  setMetadata() {
    this.eventHandlers.onProgressChanged({
      percentCompleted: ++this.ambiguousProgress,
      Rate: "",
      AverageSpeed: "",
      TimeRemaining: "",
    });
    const logProperties = {
      fileName: this.uploadData.File!.name,
      fileSize: this.uploadData.File!.size,
    };
    this.log("Setting Metadata.", logProperties);
    const fileExt = this.uploadData.File!.name.split(".").pop() as string;
    const mimeTypeParam = MimeTypes[fileExt] ? `&content_type=${encodeURIComponent(MimeTypes[fileExt])}` : ``;
    const self = this;
    this.sendRequest({
      type: "POST",
      useAuthentication: true,
      url:
        self.uploadBaseUrls.SetMetadata +
        encodeURIComponent(self.uploadData.AssetId) +
        "?file_name=" +
        encodeURIComponent(self.uploadData.File!.name) +
        "&file_size=" +
        encodeURIComponent(self.uploadData.File!.size) +
        mimeTypeParam,
      error: function (err: Error) {
        if (err instanceof HttpError) {
          Object.assign(logProperties, {
            StatusCode: err.status,
            StatusText: err.statusText,
          });
          self.error("The asset cannot be uploaded. Failed to set metadata.", logProperties);
        } else {
          self.error("Upload Failed. No network detected. Please try again." + err, {}, McFusUploadState.Error);
        }
      },
      success: function (response: any) {
        self.eventHandlers.onProgressChanged({
          percentCompleted: ++self.ambiguousProgress,
          Rate: "",
          AverageSpeed: "",
          TimeRemaining: "",
        });
        // if we get an html document back we likely have a server error so report it and stop
        if (response.error === undefined && response.toString().indexOf("<!DOCTYPE html>") === 0) {
          //strip off everything outside the body tags
          const body = response.replace(/^[\S\s]*<body[^>]*?>/i, "").replace(/<\/body[\S\s]*$/i, "");
          self.error(body);
          return;
        }

        // Probably dead code - unable to return error body for 200 status code
        if (response.error) {
          Object.assign(logProperties, {
            StatusCode: response.currentTarget.status,
            StatusText: response.currentTarget.statusText,
          });
          self.error(response.message, logProperties);
          return;
        }

        Object.assign(logProperties, { serverLocation: response.server_location, chunkSize: response.chunk_size });
        self.log("Set metadata completed.", logProperties);
        self.uploadData.ChunkSize = response.chunk_size;
        self.uploadData.BlobPartitions = response.blob_partitions;

        // Calculate the number of chunks to send
        self.uploadData.TotalBlocks = Math.ceil(self.uploadData.File!.size / self.uploadData.ChunkSize);
        self.progressUpdateRate = Math.ceil(self.uploadData.TotalBlocks / 100);
        self.log("Chunks to upload: " + self.uploadData.TotalBlocks);

        self.enqueueChunks(response.chunk_list);

        // Handle the restart/resume/recovery scenario
        if (response.resume_restart) {
          self.setState(McFusUploadState.ResumeOrRestart);
          const remainingChunksToUpload = response.chunk_list.length;
          self.log("Chunks remaining to upload: " + remainingChunksToUpload);

          self.uploadStatus.BlocksCompleted = self.uploadData.TotalBlocks - remainingChunksToUpload;
          self.eventHandlers.onResumeRestart({ NumberOfChunksRemaining: remainingChunksToUpload });
        } else {
          self.uploadStatus.BlocksCompleted = 0;
          self.uploadStatus.StartTime = new Date();
          self.startUpload();
        }
      },
    });
  }

  setState(state: McFusUploadState) {
    this.uploadStatus.State = state;
    this.log("Setting state: " + state);
    this.eventHandlers.onStateChanged(state);
  }

  singleThreadedUpload() {
    if (this.uploadStatus.ChunkQueue.length === 0 && this.uploadStatus.InflightSet.size === 0) {
      this.uploadStatus.EndTime = new Date();
      this.finishUpload();
      return;
    }

    if (this.uploadStatus.ChunksFailedCount > this.uploadStatus.MaxErrorCount) {
      if (this.uploadStatus.State === McFusUploadState.Uploading) {
        // Treat client disconnect errors as non-fatal errors as a service health indicator.
        if (this.uploadStatus.Connected) {
          this.error("Upload Failed. Encountered too many errors while uploading. Please try again.");
        } else {
          this.error("Upload Failed. No network detected. Please try again.", {}, McFusUploadState.Error);
        }
      }
      // Cancel any single threaded operations.
      this.abortSingleThreadedUploads();
      return;
    }

    const chunkNumber = this.uploadStatus.ChunkQueue.pop();

    // Safety check in case the queue got emptied before or is still in flight.
    if (chunkNumber === undefined || this.uploadStatus.InflightSet.has(chunkNumber)) {
      return;
    }

    // Otherwise just start processing and uploading the chunk
    const start = (chunkNumber - 1) * this.uploadData.ChunkSize;
    const end = Math.min(chunkNumber * this.uploadData.ChunkSize, this.uploadData.File!.size);
    const chunk = this.uploadData.File!.slice(start, end);

    // Don't request if chunk is empty or in the wrong state
    if (!this.isValidChunk(chunk) || this.uploadStatus.State !== McFusUploadState.Uploading) {
      return;
    }

    this.uploadChunk(chunk, chunkNumber);
  }

  abortSingleThreadedUploads() {
    this.uploadStatus.AbortController.abort();
  }

  getLoggingProperties(data: LogProperties) {
    const properties = {
      AssetId: this.uploadData.AssetId,
      CorrelationId: this.uploadData.CorrelationId,
      Tenant: this.uploadData.Tenant,
    };
    Object.assign(properties, data);
    return properties;
  }

  uploadChunk(chunk: Buffer, chunkNumber: number) {
    this.uploadStatus.InflightSet.add(chunkNumber);
    this.log("Starting upload for chunk: " + chunkNumber);
    const self = this;
    this.sendRequest({
      type: "POST",
      useAuthentication: true,
      chunk: chunk,
      url: self.uploadBaseUrls.UploadChunk + encodeURIComponent(self.uploadData.AssetId) + "?block_number=" + chunkNumber,
      error: function (err: Error) {
        self.uploadStatus.InflightSet.delete(chunkNumber);
        self.uploadChunkErrorHandler(err, chunkNumber);
      },
      success: function (response: any) {
        self.uploadStatus.InflightSet.delete(chunkNumber);
        if (response.error) {
          self.uploadChunkErrorHandler(response.error, chunkNumber);
          return;
        } else {
          // If a user is struggling to upload, we can increase the MaxErrorCount on each success in order to keep trying while they are making some progress.
          ++self.uploadStatus.MaxErrorCount;
          self.uploadStatus.Connected = true;
          self.log("ChunkSucceeded: " + chunkNumber + ".");
          if (++self.uploadStatus.BlocksCompleted % self.progressUpdateRate === 0) {
            self.reportProgress();
          }
        }

        self.singleThreadedUpload();
      },
    });
  }

  uploadChunkErrorHandler(error: Error, chunkNumber: number) {
    ++this.uploadStatus.ChunksFailedCount;
    this.uploadStatus.ChunkQueue.push(chunkNumber);
    if (error instanceof HttpError) {
      this.log("ChunkFailed: " + chunkNumber + ".", {
        StatusCode: error.status,
        StatusText: error.statusText,
      });
      this.uploadStatus.Connected = true;
      this.singleThreadedUpload();
    } else {
      // If the user has gone offline, use a timeout for retrying instead
      this.log("ChunkFailed: " + chunkNumber + ": " + error.message);
      this.uploadStatus.Connected = false;
      this.log("No network detected. Attempting chunk upload again in 10s.");
      const self = this;
      setTimeout(() => {
        self.singleThreadedUpload();
      }, 1000 * 10 /* 10 seconds */);
    }
  }

  Start(file: McFusFile): void {
    if (!file || file.size <= 0) {
      this.error("A file must be specified and must not be empty.", {}, McFusUploadState.Error);
      return;
    }

    if (this.isUploadInProgress()) {
      // Non fatal error. Introducing a warning level is an API breaking change in portal. error() changes state.
      this.log("Cannot start an upload that is already in progress.", undefined, McFusMessageLevel.Error);
      return;
    }

    this.uploadData.File = file;
    this.setState(McFusUploadState.Initialized);
    this.setMetadata();
  }

  Cancel() {
    this.log("UploadCancelled");

    const self = this;
    this.sendRequest({
      type: "POST",
      useAuthentication: true,
      url: self.uploadBaseUrls.CancelUpload + encodeURIComponent(self.uploadData.AssetId),
      success: function (response: any) {
        self.log(response.message);
        self.setState(McFusUploadState.Cancelled);

        self.abortSingleThreadedUploads();
      },
    });
  }
}

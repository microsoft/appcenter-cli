export interface McFusUploader {
  start(file: McFusFile): void;
  cancel(): void;
}

export enum McFusMessageLevel {
  Information = 0,
  Verbose = 1,
  Error = 2,
}

export enum McFusUploadState {
  New = 0,
  Initialized = 10,
  Uploading = 20,
  ResumeOrRestart = 40,
  Paused = 50,
  Error = 60,
  Cancelled = 80,
  Verifying = 90,
  Completed = 100,
  FatalError = 500,
}

export interface IRequiredSettings {
  AssetId: string;
  UploadDomain: string;
  Tenant: string;
  UrlEncodedToken: string;
}

export interface IEventSettings {
  onProgressChanged(progress: IProgress): void;
  onCompleted(uploadStats: IUploadStats): void;
  onResumeRestart(OnResumeStartParams: IOnResumeStartParams): void;
  onMessage(message: string, properties: LogProperties, messageLevel: McFusMessageLevel): void;
  onStateChanged(state: McFusUploadState): void;
}

export interface IOptionalSettings {
  AssetId: string;
  CallbackUrl?: string;
  CorrelationId?: string;
  CorrelationVector?: string;
  LogToConsole?: boolean;
}

export interface IInitializeSettings extends IRequiredSettings, IEventSettings, IOptionalSettings {}

export interface IOnResumeStartParams {
  NumberOfChunksRemaining: number;
}

export interface IUploadStatus {
  AutoRetryCount: number;
  AverageSpeed: number;
  BlocksCompleted: number;
  ChunksFailedCount: number;
  ChunkQueue: Array<number>;
  Connected: boolean;
  EndTime: Date;
  InflightSet: Set<number>;
  AbortController: AbortController;
  MaxErrorCount: number;
  ServiceCallback: IServiceCallback;
  StartTime: Date;
  State: McFusUploadState;
  TransferQueueRate: number[];
}

export interface IServiceCallback {
  AutoRetryCount: number;
  AutoRetryDelay: number;
  FailureCount: number;
}

export interface IProgress {
  percentCompleted: number;
  Rate: string;
  AverageSpeed: string;
  TimeRemaining: string;
}

export interface IUploadData {
  AssetId: string;
  BlobPartitions: number;
  CallbackUrl: string;
  CorrelationId: string;
  CorrelationVector: string;
  ChunkSize: number;
  File?: McFusFile;
  LogToConsole: boolean;
  Tenant: string;
  UrlEncodedToken: string;
  TotalBlocks: number;
  UploadDomain: string;
}

export interface IUploadStats {
  AssetId: string;
  TotalTimeInSeconds: string;
  AverageSpeedInMbps: number;
}

export type LogProperties = { [key: string]: string | string[] | number | boolean | undefined };

export interface McFusFile {
  readonly name: string;
  readonly size: number;
  slice(start: number, end: number): Buffer;
}

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

export interface IWorker {
  // TODO Consider adding "worker-threads" to the library and specify it instead of ""
  onmessage: ((this: AbstractWorker | any, ev: MessageEvent) => any) | null;
  postMessage(message: any): void;
  terminate(): void;
  onerror: ((this: AbstractWorker | any, ev: ErrorEvent) => any) | null;
  Domain: string;
  sendChunk(chunk: any, chunkNumber: number, url: string, correlationId: string): void;
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
  Uploaders?: number;
  WorkerScript?: string;
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
  InflightChunks: InflightModelChunk[];
  InflightSet: Set<number>;
  AbortController: AbortController;
  MaxErrorCount: number;
  ServiceCallback: IServiceCallback;
  StartTime: Date;
  State: McFusUploadState;
  TransferQueueRate: number[];
  Workers: IWorker[];
  WorkerErrorCount: number;
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
  Uploaders: number;
  WorkerScript: string;
}

export interface IUploadStats {
  AssetId: string;
  TotalTimeInSeconds: string;
  AverageSpeedInMbps: number;
}

export interface IInflightChunk {
  getWorker(): any;
  getChunkNumber(): number;
  getStarted(): Date;
}

export class InflightModelChunk implements IInflightChunk {
  private chunkNumber: number;
  private started: Date;
  private worker: any;

  public constructor(chunk: number, worker: any) {
    this.worker = worker;
    this.chunkNumber = chunk;
    this.started = new Date();
  }

  public getWorker(): any {
    return this.worker;
  }
  public getChunkNumber(): number {
    return this.chunkNumber;
  }
  public getStarted(): Date {
    return this.started;
  }
}

export type LogProperties = { [key: string]: string | string[] | number | boolean | undefined };

export interface McFusFile {
  readonly name: string;
  readonly size: number;
  slice(start: number, end: number): Buffer;
}

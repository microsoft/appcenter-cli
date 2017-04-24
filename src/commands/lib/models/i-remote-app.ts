import { IAppBase } from './i-app-base';

export interface IRemoteApp extends IAppBase {
  appName: string,
  ownerName: string,
  appSecret: string
}
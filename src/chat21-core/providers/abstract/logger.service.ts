import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export abstract class LoggerService {

  constructor() { }
  
  abstract setLoggerConfig(isLogEnabled: boolean, logLevel: number);
  abstract debug(...message: any[])
  abstract warn(...message: any[])
  abstract info(...message: any[])
  abstract error(...message: any[])
}

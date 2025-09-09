/**
 * Structured logging interface for the unpak.js library
 * Provides different log levels and contextual information
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface ILogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * Basic console logger implementation
 */
export class ConsoleLogger implements ILogger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug('[DEBUG]', message, context ? JSON.stringify(context) : '');
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.INFO) {
      console.info('[INFO]', message, context ? JSON.stringify(context) : '');
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', message, context ? JSON.stringify(context) : '');
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', message, error?.message || '', context ? JSON.stringify(context) : '');
      if (error?.stack) {
        console.error(error.stack);
      }
    }
  }
}

// Global logger instance
export const logger: ILogger = new ConsoleLogger();
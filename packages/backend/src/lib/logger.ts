export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: Date;
  requestId?: string;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private requestId?: string;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  clearRequestId(): void {
    this.requestId = undefined;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      requestId: this.requestId,
    };

    const levelName = LogLevel[level];
    const contextStr = context ? JSON.stringify(context) : '';
    const requestIdStr = this.requestId ? `[${this.requestId}]` : '';

    console.log(
      `[${entry.timestamp.toISOString()}] ${requestIdStr} ${levelName}: ${message} ${contextStr}`
    );
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.setLevel(this.level);
    if (this.requestId) {
      childLogger.setRequestId(this.requestId);
    }

    // Override log method to include parent context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, childContext?: LogContext) => {
      originalLog(level, message, { ...context, ...childContext });
    };

    return childLogger;
  }
}

export const logger = new Logger();

// Set log level from environment
if (process.env.LOG_LEVEL) {
  const level = LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel];
  if (level !== undefined) {
    logger.setLevel(level);
  }
}

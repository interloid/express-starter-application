import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import pino, {
  type Logger as PinoLogger,
  type LoggerOptions as PinoConfigOptions,
  type TransportTargetOptions,
} from 'pino';
import { env } from '../config/env.config.js';

export const DEFAULT_REDACT_PATHS: string[] = [
  'password',
  '*.password',
  'passwordConfirmation',
  '*.passwordConfirmation',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'apiKey',
  '*.apiKey',
  'secret',
  '*.secret',
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'headers.authorization',
  'headers.cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  'request.headers.authorization',
  'request.headers.cookie',
];

export interface LoggerFileOptions {
  directory?: string;
  alsoStdout?: boolean;
}

export interface LoggerOptions {
  level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  format?: 'json' | 'pretty';
  serviceName?: string;
  file?: LoggerFileOptions;
  redact?: string[];
  newRelic?: boolean;
}

class Logger {
  private pinoInstance!: PinoLogger;

  async init(options: LoggerOptions = {}): Promise<void> {
    const level = options.level || (env.APP_ENV === 'local' ? 'debug' : 'info');
    const format = options.format || (env.APP_ENV === 'local' ? 'pretty' : 'json');
    const redactPaths = options.redact || DEFAULT_REDACT_PATHS;

    const baseConfig: PinoConfigOptions = {
      level,
      timestamp: pino.stdTimeFunctions.isoTime,
    };

    if (redactPaths.length > 0) {
      baseConfig.redact = {
        paths: redactPaths,
        censor: '[REDACTED]',
      };
    }

    if (options.serviceName) {
      baseConfig.base = { service: options.serviceName };
    }

    if (options.newRelic) {
      try {
        const { default: nrPino } = await import('@newrelic/pino-enricher');
        const nrConfig = nrPino();
        this.pinoInstance = pino({
          ...baseConfig,
          ...nrConfig,
        });
        return;
      } catch (error) {
        console.error(
          '⚠️ New Relic failed to initialize, falling back to standard logging:',
          error,
        );
      }
    }

    if (!options.file) {
      if (format === 'pretty') {
        this.pinoInstance = pino({
          ...baseConfig,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
        });
      } else {
        this.pinoInstance = pino(baseConfig);
      }
      return;
    }

    const fileOpts = options.file;
    const directory = resolve(fileOpts.directory ?? './logs');
    mkdirSync(directory, { recursive: true });

    const targets: TransportTargetOptions[] = [];

    if (fileOpts.alsoStdout !== false) {
      targets.push({
        target: format === 'pretty' ? 'pino-pretty' : 'pino/file',
        level,
        options:
          format === 'pretty'
            ? {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname',
                destination: 1,
              }
            : { destination: 1 },
      });
    }

    targets.push({
      target: 'pino/file',
      level,
      options: { destination: resolve(directory, 'info.log'), mkdir: true },
    });

    targets.push({
      target: 'pino/file',
      level: 'error',
      options: { destination: resolve(directory, 'error.log'), mkdir: true },
    });

    this.pinoInstance = pino({
      ...baseConfig,
      transport: { targets },
    });
  }

  info(msg: string, context?: Record<string, unknown>): void {
    this.pinoInstance.info(context ?? {}, msg);
  }

  error(msg: string | Error, context?: Record<string, unknown>): void {
    if (msg instanceof Error) {
      this.pinoInstance.error({ err: msg, ...context }, msg.message);
    } else {
      this.pinoInstance.error(context ?? {}, msg);
    }
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    this.pinoInstance.warn(context ?? {}, msg);
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    this.pinoInstance.debug(context ?? {}, msg);
  }

  fatal(msg: string, context?: Record<string, unknown>): void {
    this.pinoInstance.fatal(context ?? {}, msg);
  }

  trace(msg: string, context?: Record<string, unknown>): void {
    this.pinoInstance.trace(context ?? {}, msg);
  }

  child(bindings: Record<string, unknown>): PinoLogger {
    return this.pinoInstance.child(bindings);
  }
}

export const logger = new Logger();

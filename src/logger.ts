import pino, { type Logger as PinoLogger, type Level, multistream } from 'pino';

export interface Logger {
  trace(fields: object, msg?: string): void;
  debug(fields: object, msg?: string): void;
  info(fields: object, msg?: string): void;
  warn(fields: object, msg?: string): void;
  error(fields: object, msg?: string): void;
}

export interface LogStreamEntry {
  readonly stream: NodeJS.WritableStream;
  readonly level?: Level;
}

const streams: LogStreamEntry[] = [{ stream: process.stdout }];

const envLevel = process.env['DIFFY_LOG_LEVEL'];

const buildPino = (): PinoLogger =>
  pino(
    {
      level: envLevel ?? 'info',
      base: null,
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    multistream(streams.map((s) => ({ stream: s.stream, level: s.level ?? 'trace' }))),
  );

let underlying: PinoLogger = buildPino();

export const addLogStream = (entry: LogStreamEntry): void => {
  streams.push(entry);
  underlying = buildPino();
};

export const logger: Logger = {
  trace: (fields, msg) => {
    underlying.trace(fields, msg);
  },
  debug: (fields, msg) => {
    underlying.debug(fields, msg);
  },
  info: (fields, msg) => {
    underlying.info(fields, msg);
  },
  warn: (fields, msg) => {
    underlying.warn(fields, msg);
  },
  error: (fields, msg) => {
    underlying.error(fields, msg);
  },
};

// deno-lint-ignore-file require-yield
import { Context, Effect, Layer } from "effect";

import * as log from "@std/log";

export class Logger extends Context.Tag("Logger")<
  Logger,
  {
    debug: typeof log.debug;
    info: typeof log.info;
    warn: typeof log.warn;
    error: typeof log.error;
    critical: typeof log.critical;
  }
>() {}

export const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    log.setup({
      handlers: {
        default: new log.ConsoleHandler("DEBUG", {
          formatter: log.formatters.jsonFormatter,
          useColors: true,
        }),
      },
    });

    return Logger.of({
      debug: log.debug,
      info: log.info,
      warn: log.warn,
      error: log.error,
      critical: log.critical,
    });
  }),
);

import { ConfigProvider, Effect, Layer } from "effect";
import { Config } from "config";
import { Schema } from "@effect/schema";
import { load } from "@std/dotenv";

const provider = Effect.gen(function* () {
  const googleConfig = yield* Effect.tryPromise({
    try() {
      return Config.load({
        file: "expensessheets-346814-70fdbcf14f23",
      });
    },
    catch(error) {
      Effect.log(error);
    },
  });

  const env = yield* Effect.tryPromise({
    try() {
      return load({ envPath: ".config/.env" });
    },
    catch(error) {
      Effect.log(error);
    },
  });

  const schema = Schema.Struct({
    client_email: Schema.String,
    private_key: Schema.String,
    token: Schema.String,
    sheet_id: Schema.String,
  });

  const config = yield* Schema.decodeUnknown(schema)({
    ...googleConfig,
    ...env,
  }).pipe(
    Effect.catchTags({
      ParseError: (cause) => Effect.die(cause),
    }),
  );

  const provider = ConfigProvider.fromMap(
    new Map([
      ["clientEmail", config.client_email],
      ["privateKey", config.private_key],
      ["token", config.token],
      ["sheetId", config.sheet_id],
    ]),
  );

  return provider;
});

const config = await provider.pipe(Effect.runPromise);

export const configLayer = Layer.setConfigProvider(
  config,
);

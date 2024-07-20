import { Config, Context, Effect, Layer } from "effect";

import { Bot } from "grammy";

export class TelegramBot extends Context.Tag("TelegramBot")<
  TelegramBot,
  {
    new: () => Effect.Effect<Bot, void>;
  }
>() {}

export const TelegramBotLive = Layer.effect(
  TelegramBot,
  Effect.gen(function* () {
    const token = yield* Config.string("token");

    const newBot = () =>
      Effect.try({
        try() {
          return new Bot(token);
        },
        catch(error) {
          return Effect.log(error);
        },
      });

    return TelegramBot.of({
      new: newBot,
    });
  }),
);

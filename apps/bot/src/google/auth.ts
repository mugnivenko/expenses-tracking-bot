import { Config, Context, Effect, Layer, Redacted } from "effect";
import { google } from "googleapis";
import { JWT } from "google-auth-library";

export class GoogleAuth extends Context.Tag("GoogleAuth")<
  GoogleAuth,
  {
    jwt: JWT;
  }
>() {}

export const GoogleAuthLive = Layer.effect(
  GoogleAuth,
  Effect.gen(function* () {
    const clientEmail = yield* Config.string("clientEmail");
    const privateKey = yield* Config.redacted("privateKey");

    return GoogleAuth.of({
      jwt: new google.auth.JWT({
        email: clientEmail,
        key: Redacted.value(privateKey),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      }),
    });
  }),
);

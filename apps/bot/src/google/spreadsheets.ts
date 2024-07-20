import { Config, Context, Effect, Layer } from "effect";

import { google, sheets_v4 } from "googleapis";
import { GaxiosResponse } from "gaxios";

import { GoogleAuth } from "./auth.ts";

export class GoogleSheets extends Context.Tag("GoogleSheets")<
  GoogleSheets,
  {
    spreadsheets: {
      batchUpdate: (
        params: sheets_v4.Params$Resource$Spreadsheets$Batchupdate,
      ) => Effect.Effect<
        GaxiosResponse<sheets_v4.Schema$BatchUpdateSpreadsheetResponse>,
        void
      >;
      values: {
        get: (
          params: sheets_v4.Params$Resource$Spreadsheets$Values$Get,
        ) => Effect.Effect<
          GaxiosResponse<sheets_v4.Schema$ValueRange>,
          void
        >;
        batchUpdate: (
          params: sheets_v4.Params$Resource$Spreadsheets$Values$Batchupdate,
        ) => Effect.Effect<
          GaxiosResponse<sheets_v4.Schema$BatchUpdateValuesResponse>,
          void
        >;
      };
    };
  }
>() {}

export const GoogleSheetsLive = Layer.effect(
  GoogleSheets,
  Effect.gen(function* () {
    const { jwt } = yield* GoogleAuth;
    const sheet = google.sheets("v4");
    const sheetId = yield* Config.string("sheetId");

    const sheetBatchUpdate = (
      params: sheets_v4.Params$Resource$Spreadsheets$Batchupdate,
    ) =>
      Effect.tryPromise({
        try(signal) {
          return sheet.spreadsheets.batchUpdate({
            auth: jwt,
            spreadsheetId: sheetId,
            ...params,
          }, { signal });
        },
        catch(error) {
          console.log(error);
          return Effect.logError(error);
        },
      });

    const sheetValuesGet = (
      params: sheets_v4.Params$Resource$Spreadsheets$Values$Get,
    ) =>
      Effect.tryPromise({
        try(signal) {
          return sheet.spreadsheets.values.get({
            auth: jwt,
            spreadsheetId: sheetId,
            ...params,
          }, { signal });
        },
        catch(error) {
          console.log(error);

          return Effect.logError(error);
        },
      });

    const sheetValuesBatchUpdate = (
      params: sheets_v4.Params$Resource$Spreadsheets$Values$Batchupdate,
    ) =>
      Effect.tryPromise({
        try(signal) {
          return sheet.spreadsheets.values.batchUpdate({
            auth: jwt,
            spreadsheetId: sheetId,
            ...params,
          }, { signal });
        },
        catch(error) {
          console.log(error);

          return Effect.logError(error);
        },
      });

    return GoogleSheets.of({
      spreadsheets: {
        batchUpdate: sheetBatchUpdate,
        values: {
          get: sheetValuesGet,
          batchUpdate: sheetValuesBatchUpdate,
        },
      },
    });
  }),
);

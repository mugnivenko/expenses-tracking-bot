import { WebAppData } from "grammy-types";
import { InputFile, Keyboard } from "grammy";

import {
  Array as EffectArray,
  Effect,
  Function,
  Layer,
  Match,
  Option,
  Order,
  pipe,
} from "effect";

import { parse } from "date-fns";

import { sheets_v4 } from "googleapis";

import { configLayer } from "./src/config.ts";
import { GoogleAuthLive } from "./src/google/auth.ts";
import { Logger, LoggerLive } from "./src/logger.ts";
import { Puppeteer, PuppeteerLive } from "./src/puppeteer.ts";
import { TelegramBot, TelegramBotLive } from "./src/bot.ts";
import { GoogleSheets, GoogleSheetsLive } from "./src/google/spreadsheets.ts";

const program = Effect.gen(function* () {
  const { new: createBot } = yield* TelegramBot;
  const logger = yield* Logger;
  const sheet = yield* GoogleSheets;
  const puppeteer = yield* Puppeteer;

  const bot = yield* createBot();

  bot.command("start", async (ctx) => {
    Match.value(ctx.message).pipe(
      Match.when(Match.undefined, () => {
        logger.warn(`No message in context for ${ctx.chatId}`);
      }),
      Match.orElse((message) => {
        logger.info(message);
      }),
    );

    bot.api.answerWebAppQuery;

    const keyboard = new Keyboard()
      .webApp(
        "Launch app",
        "https://1e9d-5-77-202-111.ngrok-free.app/",
      )
      .add("")
      .resized();

    const success = await bot.api.setMyCommands([
      { command: "start", description: "Start the bot" },
      { command: "aboba", description: "aboba" },
    ]);

    Match.value<boolean>(success).pipe(
      Match.when(true, Function.constVoid),
      Match.when(false, () => {
        ctx.reply(
          "An unexpected error occurred while setting the commands. Please contact the bot's developer.",
        );
      }),
    );

    await ctx.reply("Welcome! Up and running.", {
      reply_markup: keyboard,
    });

    // await bot.api.setChatMenuButton({
    //   chat_id: ctx.chatId,
    //   menu_button: {
    //     type: "default",
    //   },
    // });

    await bot.api.setChatMenuButton({
      chat_id: ctx.chatId,
      menu_button: {
        text: "Launch app",
        type: "web_app",
        web_app: {
          url: "https://1e9d-5-77-202-111.ngrok-free.app/",
        },
      },
    });
  });

  bot.command("aboba", (ctx) => {
    Match.value(ctx.message).pipe(
      Match.when(Match.undefined, () => {
        logger.warn(`No message in context for ${ctx.chatId}`);
      }),
      Match.orElse((message) => {
        console.log(message);
      }),
    );

    ctx.reply("Aboba!");
  });

  bot.on("message:web_app_data", async (ctx) => {
    const match = Match.type<WebAppData | undefined>().pipe(
      Match.when(
        Match.undefined,
        () => ctx.reply("No web app data was received."),
      ),
      Match.when({ data: Match.nonEmptyString }, async (data) => {
        await Effect.gen(function* () {
          const savedData = yield* sheet.spreadsheets.values.get({
            range: "Sheet1!A:N",
          });

          const {
            date,
            screenshot,
            invoiceNumber,
            parsedDate,
            items,
            tin,
            shopFullName,
            address,
            city,
            totalAmount,
          } = yield* puppeteer
            .gotoPage(data.data);

          ctx.replyWithPhoto(new InputFile(screenshot));

          console.log(savedData.data.values);

          Match.value(savedData.data.values).pipe(
            Match.when(Match.null, Function.constVoid),
            Match.when(Match.undefined, Function.constVoid),
            Match.when((values) => EffectArray.isArray(values), (values) => {
              const findExistingId = (values: unknown[]) => {
                const [id] = values;
                return Match.type().pipe(
                  Match.when(
                    Match.nonEmptyString,
                    (id) => id === invoiceNumber,
                  ),
                  Match.orElse(() => false),
                )(id);
              };

              const findGreaterDate = (values: unknown[]) => {
                const [, date] = values;
                return Match.type().pipe(
                  Match.when("Date", () => false),
                  Match.when(Match.nonEmptyString, (date) => {
                    return pipe(
                      Order.Date,
                      Order.lessThanOrEqualTo,
                    )(
                      parsedDate,
                      parse(date, "dd.MM.y. H:mm:ss", new Date()),
                    );
                  }),
                  Match.orElse(() => false),
                )(date);
              };

              const fintInNonEmptyArray = (func: (b: unknown[]) => boolean) =>
                pipe(
                  values,
                  EffectArray.findFirstIndex((value) =>
                    Match.type<unknown[]>().pipe(
                      Match.when(EffectArray.isEmptyArray, () => false),
                      Match.orElse(func),
                    )(value)
                  ),
                );

              const existingReceipt = fintInNonEmptyArray(findExistingId);

              Option.match(existingReceipt, {
                onSome(val) {
                  logger.info({ val });

                  ctx.reply("Already added!");
                },
                onNone() {
                  const greaterDate = fintInNonEmptyArray(findGreaterDate);

                  const receipt = [
                    invoiceNumber,
                    date,
                    tin,
                    city,
                    address,
                    shopFullName,
                    totalAmount,
                    ctx.message.web_app_data?.data,
                  ];

                  const products = items.items.map(({
                    gtin,
                    name,
                    quantity,
                    total,
                    unitPrice,
                    taxBaseAmount,
                    vatAmount,
                  }) => [
                    gtin,
                    name,
                    quantity,
                    total,
                    unitPrice,
                    taxBaseAmount,
                    vatAmount,
                  ]);

                  const newValues = [
                    receipt,
                    ...products,
                  ];

                  const batchUpdateRequests = (
                    index: number,
                    range: sheets_v4.Schema$GridRange,
                    requests?: sheets_v4.Schema$Request[],
                  ) => ({
                    requests: [
                      {
                        addNamedRange: {
                          namedRange: {
                            name: `NamedRange${
                              invoiceNumber.replaceAll("-", "_")
                            }`,
                            namedRangeId: invoiceNumber,
                            range: {
                              sheetId: 0,
                              startColumnIndex: 8,
                              endColumnIndex: 15,
                              startRowIndex: index + 1,
                              endRowIndex: index + newValues.length,
                            },
                          },
                        },
                      },
                      ...requests ?? [],
                      {
                        repeatCell: {
                          range,
                          cell: {
                            userEnteredFormat: {
                              backgroundColor: {
                                red: 0.9529411764705882,
                                green: 0.9529411764705882,
                                blue: 0.9529411764705882,
                              },
                            },
                          },
                          fields: "*",
                        },
                      },
                    ],
                  });

                  Option.match(greaterDate, {
                    async onSome(index) {
                      logger.info({ invoiceNumber, index });
                      await Effect.gen(function* () {
                        yield* sheet.spreadsheets
                          .batchUpdate({
                            requestBody: {
                              includeSpreadsheetInResponse: true,
                              requests: [{
                                insertDimension: {
                                  inheritFromBefore: true,
                                  range: {
                                    sheetId: 0,
                                    dimension: "ROWS",
                                    startIndex: index - 1,
                                    endIndex: index + newValues.length,
                                  },
                                },
                              }],
                            },
                          });

                        yield* sheet.spreadsheets.values
                          .batchUpdate({
                            requestBody: {
                              includeValuesInResponse: true,
                              valueInputOption: "RAW",
                              data: [
                                {
                                  range: `Sheet1!A${index + 1}:H${index + 1}`,
                                  majorDimension: "ROWS",
                                  values: [receipt],
                                },
                                {
                                  range: `Sheet1!I${index + 2}:O${
                                    index + 3 + products.length
                                  }`,
                                  majorDimension: "ROWS",
                                  values: products,
                                },
                              ],
                            },
                          });

                        const clearBackground = Match.type<number>().pipe(
                          Match.when(2, () => [
                            {
                              repeatCell: {
                                range: {
                                  sheetId: 0,
                                  startRowIndex: index - 1,
                                  endRowIndex: index + newValues.length,
                                },
                                cell: {
                                  userEnteredFormat: {
                                    backgroundColor: {
                                      red: 1,
                                      green: 1,
                                      blue: 1,
                                    },
                                  },
                                },
                                fields: "userEnteredFormat",
                              },
                            },
                          ]),
                          Match.orElse(() => []),
                        );

                        yield* sheet.spreadsheets
                          .batchUpdate({
                            requestBody: {
                              includeSpreadsheetInResponse: true,
                              ...batchUpdateRequests(index, {
                                sheetId: 0,
                                startRowIndex: index - 1,
                                endRowIndex: index,
                              }, clearBackground(index)),
                            },
                          });
                      }).pipe(Effect.runPromise);
                      await ctx.reply(
                        `The receipt with PFR account number ${invoiceNumber} was added`,
                      );
                    },
                    async onNone() {
                      const index = values.length;

                      await Effect.gen(function* () {
                        yield* Effect.log({ aaaaaaaaaaaaaaa: 1 });

                        yield* sheet.spreadsheets
                          .batchUpdate({
                            requestBody: {
                              includeSpreadsheetInResponse: true,
                              requests: [{
                                insertDimension: {
                                  range: {
                                    sheetId: 0,
                                    dimension: "ROWS",
                                    startIndex: index,
                                    endIndex: index + newValues.length,
                                  },
                                },
                              }],
                            },
                          });

                        yield* sheet.spreadsheets.values
                          .batchUpdate({
                            requestBody: {
                              includeValuesInResponse: true,
                              valueInputOption: "RAW",
                              data: [
                                {
                                  range: `Sheet1!A${index + 1}:H${index + 1}`,
                                  majorDimension: "ROWS",
                                  values: [receipt],
                                },
                                {
                                  range: `Sheet1!I${index + 2}:O${
                                    index + 3 + products.length
                                  }`,
                                  majorDimension: "ROWS",
                                  values: products,
                                },
                              ],
                            },
                          });

                        yield* sheet.spreadsheets
                          .batchUpdate({
                            requestBody: {
                              includeSpreadsheetInResponse: true,
                              ...batchUpdateRequests(index, {
                                sheetId: 0,
                                startRowIndex: index,
                                endRowIndex: index + 1,
                              }, [
                                {
                                  insertDimension: {
                                    range: {
                                      sheetId: 0,
                                      dimension: "ROWS",
                                      startIndex: index,
                                      endIndex: index + 1,
                                    },
                                  },
                                },
                              ]),
                            },
                          });
                      }).pipe(Effect.runPromise);

                      await ctx.reply(
                        `The receipt with PFR account number ${invoiceNumber} was added`,
                      );
                    },
                  });
                },
              });
            }),
            Match.orElse(Function.constVoid),
          );
        }).pipe(Effect.runPromise);
      }),
      Match.orElse(() => ctx.reply("Could not process an empty string.")),
    );

    await match(ctx.message.web_app_data);
  });

  bot.catch((error) => {
    error.ctx.reply(
      "An unexpected error occurred. Please contact the bot's developer.",
    );
    logger.error(error);
  });

  yield* Effect.tryPromise({
    try() {
      logger.info("The bot has started!");
      return bot.start();
    },
    catch(error) {
      logger.error(error);
    },
  });
});

const GoogleLive = GoogleSheetsLive.pipe(
  Layer.provide(GoogleAuthLive),
);

const runnable = Effect.provide(
  program,
  Layer.mergeAll(TelegramBotLive, LoggerLive, GoogleLive, PuppeteerLive),
);

const runnableWithConfig = Effect.provide(runnable, configLayer);

Effect.runPromiseExit(runnableWithConfig).then(console.log);

// bot.command("start", async (ctx) => {
//

// bot.on("message:web_app_data", async (ctx) => {
//   try {
//     // await page.setCookie({
//     //   url: ctx.message.web_app_data?.data,
//     //   name: "localization",
//     //   value: "lang=en-US",
//     // });

//     // console.log({
//     //   fffffffff: data.Items.map(({
//     //     GTIN,
//     //     Name,
//     //     Quantity,
//     //     Total,
//     //     UnitPrice,
//     //     TaxBaseAmount,
//     //     VatAmount,
//     //   }) => [
//     //     // "",
//     //     // "",
//     //     // "",
//     //     // "",
//     //     // "",
//     //     // "",
//     //     // "",
//     //     GTIN,
//     //     Name,
//     //     Quantity,
//     //     UnitPrice,
//     //     Total,
//     //     TaxBaseAmount,
//     //     VatAmount,
//     //   ]),
//     // });

//     const savedData = await sheet.spreadsheets.values.get({
//       auth,
//       spreadsheetId: SHEET_ID,
//       range: "Sheet1!A:N",
//     });

//     // if (EffectArray.isEmptyArray(arr)) return false;
//     // const [id] = arr;
//     // if (EffectString.isEmpty(id)) return false;
//     // return id === invoiceNumber;

//     /*
//      * const matchDate = Match.type().pipe(
//      *   Match.when("Date", () => false),
//      *   Match.when(Match.nonEmptyString, (date) => {
//      *     const comparator = pipe(
//      *       Order.Date,
//      *       Order.greaterThan,
//      *     );
//      *     return comparator(
//      *       parsedDate,
//      *       parse(date, "dd.MM.y. H:mm:ss", new Date()),
//      *     );
//      *   }),
//      *   Match.orElse(() => false),
//      * );
//      */

//     Match.type<unknown[][] | null | undefined>().pipe(
//       Match.when(Match.null, Function.constVoid),
//       Match.when(Match.undefined, Function.constVoid),
//       Match.when((values) => EffectArray.isArray(values), (values) => {
//         const findExistingId = (values: unknown[]) => {
//           const [id] = values;

//           logger.info({ id });

//           return Match.type().pipe(
//             Match.when(
//               Match.nonEmptyString,
//               (id) => id === invoiceNumber,
//             ),
//             Match.orElse(() => false),
//           )(id);
//         };

//         const findGreaterDate = (values: unknown[]) => {
//           const [, date] = values;

//           logger.info({ date });

//           return Match.type().pipe(
//             Match.when("Date", () => false),
//             Match.when(Match.nonEmptyString, (date) =>
//               pipe(
//                 Order.Date,
//                 Order.lessThanOrEqualTo,
//               )(
//                 parsedDate,
//                 parse(date, "dd.MM.y. H:mm:ss", new Date()),
//               )),
//             Match.orElse(() => false),
//           )(date);
//         };

//         const fintInNonEmptyArray = (func: (b: unknown[]) => boolean) =>
//           pipe(
//             values,
//             EffectArray.findFirstIndex((value) =>
//               Match.type<unknown[]>().pipe(
//                 Match.when(EffectArray.isEmptyArray, () => false),
//                 Match.orElse(func),
//               )(value)
//             ),
//           );

//         const existingReceipt = fintInNonEmptyArray(findExistingId);

//         Option.match(existingReceipt, {
//           onSome(val) {
//             logger.info({ val });

//             ctx.reply("Already added!");
//           },
//           onNone() {
//             const greaterDate = fintInNonEmptyArray(findGreaterDate);

//             Option.match(greaterDate, {
//               onSome(index) {
//                 logger.info({ index });
//               },
//               onNone() {
//               },
//             });
//           },
//         });
//       }),
//       Match.orElse(Function.constVoid),
//     )(savedData.data.values);

//     // if (
//     //   pipe(
//     //     savedData.data.values ?? [],
//     //     EffectArray.findFirst((arr) => {
//     //       if (EffectArray.isEmptyArray(arr)) return false;
//     //       const [id] = arr;
//     //       if (EffectString.isEmpty(id)) return false;
//     //       return id === invoiceNumber;
//     //     }),
//     //     Option.isSome,
//     //   )
//     // ) {
//     //   ctx.reply("Already added!");
//     //   return;
//     // }

//     // const g = pipe(
//     //   savedData.data.values ?? [],
//     //   EffectArray.findFirstIndex((arr) => {
//     //     if (EffectArray.isEmptyArray(arr)) return false;
//     //     const [, date] = arr;
//     //     if (EffectString.isEmpty(date) || date === "Date") return false;
//     //     return compareDesc(
//     //       parsedDate,
//     //       parse(date, "dd.MM.y. H:mm:ss", new Date()),
//     //     ) > 0;
//     //   }),
//     // );

//     // const values = [
//     //   [
//     //     invoiceNumber,
//     //     date,
//     //     tin,
//     //     city,
//     //     address,
//     //     shopFullName,
//     //     totalAmount,
//     //     ctx.message.web_app_data?.data,
//     //   ],
//     //   ...data.Items.map(({
//     //     GTIN,
//     //     Name,
//     //     Quantity,
//     //     Total,
//     //     UnitPrice,
//     //     TaxBaseAmount,
//     //     VatAmount,
//     //   }) => [
//     //     "",
//     //     "",
//     //     "",
//     //     "",
//     //     "",
//     //     "",
//     //     "",
//     //     "",
//     //     GTIN,
//     //     Name,
//     //     Quantity,
//     //     UnitPrice,
//     //     Total,
//     //     TaxBaseAmount,
//     //     VatAmount,
//     //   ]),
//     // ];

//     const endRowIndex = Option.match(g, {
//       onSome: async (val) => {
//         const appendBeforeSave = await sheet.spreadsheets.batchUpdate({
//           spreadsheetId: SHEET_ID,
//           auth,
//           requestBody: {
//             includeSpreadsheetInResponse: true,
//             requests: [{
//               insertDimension: {
//                 inheritFromBefore: true,
//                 range: {
//                   sheetId: 0,
//                   dimension: "ROWS",
//                   startIndex: val - 1,
//                   endIndex: val + values.length,
//                 },
//               },
//             }],
//           },
//         });

//         const append = await sheet.spreadsheets.values.batchUpdate({
//           spreadsheetId: SHEET_ID,
//           auth,
//           requestBody: {
//             includeValuesInResponse: true,
//             valueInputOption: "RAW",
//             data: [
//               {
//                 range: `Sheet1!A${val + 1}:O${val + values.length}`,
//                 majorDimension: "ROWS",
//                 values,
//               },
//             ],
//           },
//         });

//         await append;

//         const namedRange = await sheet.spreadsheets.batchUpdate({
//           spreadsheetId: SHEET_ID,
//           auth,
//           requestBody: {
//             includeSpreadsheetInResponse: true,
//             requests: [
//               {
//                 addNamedRange: {
//                   namedRange: {
//                     name: `NamedRange${invoiceNumber.replaceAll("-", "_")}`,
//                     namedRangeId: invoiceNumber,
//                     range: {
//                       sheetId: 0,
//                       startColumnIndex: 8,
//                       endColumnIndex: 15,
//                       startRowIndex: val + 1,
//                       endRowIndex: val + values.length,
//                     },
//                   },
//                 },
//               },
//               {
//                 repeatCell: {
//                   range: {
//                     sheetId: 0,
//                     startRowIndex: val - 1,
//                     endRowIndex: val,
//                   },
//                   cell: {
//                     userEnteredFormat: {
//                       backgroundColor: {
//                         red: 0.9529411764705882,
//                         green: 0.9529411764705882,
//                         blue: 0.9529411764705882,
//                       },
//                     },
//                   },
//                   fields: "*",
//                 },
//               },
//             ],
//           },
//         });

//         console.log({
//           append, // append2
//           namedRange,
//           //
//           appendBeforeSave,
//         });
//       },
//       onNone: async () => {
//         const index = savedData.data.values?.length ?? 0;

//         const appendBeforeSave = await sheet.spreadsheets.batchUpdate({
//           spreadsheetId: SHEET_ID,
//           auth,
//           requestBody: {
//             includeSpreadsheetInResponse: true,
//             requests: [{
//               insertDimension: {
//                 range: {
//                   sheetId: 0,
//                   dimension: "ROWS",
//                   startIndex: index,
//                   endIndex: index + values.length,
//                 },
//               },
//             }],
//           },
//         });

//         const append = await sheet.spreadsheets.values.batchUpdate({
//           spreadsheetId: SHEET_ID,
//           auth,
//           requestBody: {
//             includeValuesInResponse: true,
//             valueInputOption: "RAW",
//             data: [
//               {
//                 range: `Sheet1!A${index + 1}:O${index + values.length}`,
//                 majorDimension: "ROWS",
//                 values,
//               },
//             ],
//           },
//         });

//         await append;

//         const namedRange = await sheet.spreadsheets.batchUpdate({
//           spreadsheetId: SHEET_ID,
//           auth,
//           requestBody: {
//             includeSpreadsheetInResponse: true,
//             requests: [
//               {
//                 addNamedRange: {
//                   namedRange: {
//                     name: `NamedRange${invoiceNumber.replaceAll("-", "_")}`,
//                     namedRangeId: invoiceNumber,
//                     range: {
//                       sheetId: 0,
//                       startColumnIndex: 8,
//                       endColumnIndex: 15,
//                       startRowIndex: index + 1,
//                       endRowIndex: index + values.length,
//                     },
//                   },
//                 },
//               },
//               {
//                 insertDimension: {
//                   range: {
//                     sheetId: 0,
//                     dimension: "ROWS",
//                     startIndex: index,
//                     endIndex: index + 1,
//                   },
//                 },
//               },
//               {
//                 repeatCell: {
//                   range: {
//                     sheetId: 0,
//                     startRowIndex: index,
//                     endRowIndex: index + 1,
//                   },
//                   cell: {
//                     userEnteredFormat: {
//                       backgroundColor: {
//                         red: 0.9529411764705882,
//                         green: 0.9529411764705882,
//                         blue: 0.9529411764705882,
//                       },
//                     },
//                   },
//                   fields: "*",
//                 },
//               },
//             ],
//           },
//         });

//         console.log({
//           append, // append2
//           namedRange,

//           appendBeforeSave,
//         });
//       },
//     });

//     console.log({
//       endRow: await endRowIndex,
//     });
//   } catch (error) {
//     console.log({ error });
//   }
// });

// bot.command("aboba", async (ctx) => {
//   try {
//     // const get = await sheet.spreadsheets.getByDataFilter({
//     //   auth,
//     //   spreadsheetId: SHEET_ID,
//     //   requestBody: {
//     //     dataFilters: [{
//     //       a1Range: "Sheet1!B:B",
//     //     }],
//     //   },
//     // });

//     // const aa = await sheet.spreadsheets.values.get({
//     //   auth,
//     //   spreadsheetId: SHEET_ID,
//     //   range: "Sheet1!B:B",
//     // });

//     // console.log({ jjjjjjj: get.data.sheets?.at(0)?.protectedRanges?.at(0) });

//     // const h = await sheet.spreadsheets.get({
//     //   auth,
//     //   spreadsheetId: SHEET_ID,
//     //   ranges: [get.data.sheets?.at(0)?.properties?.title ?? ""],
//     // });

//     // const delete1 = await sheet.spreadsheets.batchUpdate({
//     //   auth,
//     //   spreadsheetId: SHEET_ID,
//     //   requestBody: {
//     //     requests: [
//     //       {
//     //         deleteRange: {
//     //           range: {
//     //             sheetId: 0,
//     //             startRowIndex: 1,
//     //             startColumnIndex: 0,
//     //             endRowIndex: 3,
//     //           },
//     //           shiftDimension: "ROWS",
//     //         },
//     //       },
//     //     ],
//     //   },
//     // });

//     // const g = pipe(
//     //   aa.data.values ?? [],
//     //   EffectArray.findFirstIndex(([date]) => {
//     //     if (!isString(date) || date === "Date") return false;
//     //     return compareAsc(
//     //       parse(date, "dd.MM.y. H:mm:ss", new Date()),
//     //       new Date("2024-05-28T18:46:40.000Z"),
//     //     ) > 0;
//     //   }),
//     // );

//     // console.log({
//     //   // get: get.data.sheets,
//     //   aa: aa.data.values,
//     //   g,
//     //   // delete1,
//     //   // h,
//     // });

//     const invoiceNumber = "XJEQXHJA-XJEQXHJA-20448";
//     const parsedDate = parse(
//       "03.06.2024. 10:27:53",
//       "dd.MM.y. H:mm:ss",
//       new Date(),
//     );

//     const savedData = await sheet.spreadsheets.values.get({
//       auth,
//       spreadsheetId: SHEET_ID,
//       range: "Sheet1!A:N",
//     });

//
//   } catch (error) {
//     console.log(error);
//   }
// });

// bot.start();
// logger.info("The bot has started!");

// bot.catch((err) => {
//   console.log({ err });
// });

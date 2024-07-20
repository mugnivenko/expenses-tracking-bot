// deno-lint-ignore-file require-yield
import { Context, Effect, Layer } from "effect";

import puppeteer from "puppeteer";
import { parse } from "date-fns";

export class Puppeteer extends Context.Tag("Puppeteer")<
  Puppeteer,
  {
    gotoPage: (receiptUrl: string) => Effect.Effect<{
      date: string;
      parsedDate: Date;
      tin: string;
      shopFullName: string;
      address: string;
      city: string;
      invoiceNumber: string;
      totalAmount: string;
      items: {
        success: true;
        items: [
          {
            gtin: string;
            name: string;
            quantity: number;
            total: number;
            unitPrice: number;
            label: string;
            labelRate: number;
            taxBaseAmount: number;
            vatAmount: number;
          },
        ];
      };
      screenshot: Buffer;
    }, void>;
  }
>() {}

export const PuppeteerLive = Layer.effect(
  Puppeteer,
  Effect.gen(function* (_) {
    const gotoPage = (receiptUrl: string) =>
      Effect.gen(function* () {
        const browser = yield* Effect.tryPromise({
          try() {
            return puppeteer.launch();
          },
          catch(error) {
            Effect.logError(error);
          },
        });

        const page = yield* Effect.tryPromise({
          try() {
            return browser.newPage();
          },
          catch(error) {
            Effect.logError(error);
          },
        });

        const getElementContent = (selector: string) =>
          Effect.tryPromise({
            try: async () => {
              const elem = await page.waitForSelector(selector);
              return page.evaluate(
                (elem) => elem.textContent.trim(),
                elem,
              );
            },
            catch(error) {
              Effect.logError(error);
            },
          });

        yield* Effect.tryPromise({
          try() {
            return page.goto(receiptUrl);
          },
          catch(error) {
            Effect.logError(error);
          },
        });

        yield* Effect.tryPromise({
          try() {
            return page.click(
              "body > div.container > div > form > div:nth-child(3) > div > div > div.panel-heading > h5 > a",
            );
          },
          catch(error) {
            return Effect.logError(error);
          },
        });

        const itemsRes = yield* Effect.tryPromise({
          try() {
            return page.waitForResponse(
              "https://suf.purs.gov.rs/specifications",
            );
          },
          catch(error) {
            Effect.logError(error);
          },
        });

        const date = yield* getElementContent("#sdcDateTimeLabel");
        const parsedDate = parse(date, "dd.MM.y. H:mm:ss", new Date());

        yield* Effect.log({ date, parsedDate });

        const tin = yield* getElementContent("#tinLabel");
        const shopFullName = yield* getElementContent("#shopFullNameLabel");
        const address = yield* getElementContent("#addressLabel");

        const city = yield* getElementContent("#cityLabel");
        const invoiceNumber = yield* getElementContent("#invoiceNumberLabel");
        const totalAmount = yield* getElementContent("#totalAmountLabel");

        const items = yield* Effect.tryPromise({
          try() {
            return itemsRes.json();
          },
          catch(error) {
            Effect.logError(error);
          },
        });

        const screenshot = yield* Effect.tryPromise({
          try() {
            return page.screenshot({ fullPage: true });
          },
          catch(error) {
            Effect.logError(error);
          },
        });

        yield* Effect.tryPromise({
          try() {
            return browser.close();
          },
          catch(error) {
            Effect.logError(error);
          },
        });

        return {
          date,
          parsedDate,
          tin,
          shopFullName,
          address,
          city,
          invoiceNumber,
          totalAmount,
          items,
          screenshot,
        };
      });

    return Puppeteer.of({ gotoPage });
  }),
);

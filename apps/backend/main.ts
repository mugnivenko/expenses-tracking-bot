// import { Hono } from "hono";
// import { upgradeWebSocket } from "hono/deno";

// const app = new Hono();

// app.get("/", (ctx) => {
//   console.log("-------------------");
//   return ctx.text("Hello Hono!");
// });

// app.get(
//   "/ws",
//   upgradeWebSocket((ctx) => {
//     return {
//       onOpen(event, ws) {
//         console.log({ event });
//         ws.send('Hello from server!')
//       },
//       onMessage(event, ws) {
//         console.log({ event });
//         ws.send('Hello from server!')
//       }
//     };
//   }),
// );

// export default app;

import { Application, Router } from "@oak/oak";

const app = new Application();

// // Logger
// app.use(async (ctx, next) => {
//   await next();
//   const rt = ctx.response.headers.get("X-Response-Time");
//   console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
// });

// // Timing
// app.use(async (ctx, next) => {
//   const start = Date.now();
//   await next();
//   const ms = Date.now() - start;
//   ctx.response.headers.set("X-Response-Time", `${ms}ms`);
// });

// Hello World!
app.use((ctx) => {
  const socket = ctx.upgrade();
  socket.onopen = function (event) {
    this.send("aaaaaaaaaa");
  };
  ctx.response.body = "Hello World!";
});

const router = new Router();

router.get("/a", (ctx) => {
  // const socket = ctx.upgrade();
  // socket.onopen = (event) => {
  //   console.log({ event });
  // };
  ctx.response.body = "Hello world";
});

app.use(router.routes);
app.use(router.allowedMethods());

await app.listen({
  port: 8000,
  secure: true,
  cert: Deno.readTextFileSync("./localhost+2.pem"),
  key: Deno.readTextFileSync("./localhost+2-key.pem"),
});

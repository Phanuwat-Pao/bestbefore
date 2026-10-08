import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { verifyLineSignature } from "./lib/line";

const http = httpRouter();

// LINE Messaging API webhook. Signature-verified; stores and replies via a
// scheduled action so LINE gets its 200 fast.
http.route({
  handler: httpAction(async (ctx, request) => {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      return new Response("Server not configured", { status: 500 });
    }
    const signature = request.headers.get("x-line-signature");
    const rawBody = await request.text();
    const ok = await verifyLineSignature(rawBody, signature, channelSecret);
    if (!ok) {
      return new Response("Invalid signature", { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    const events =
      typeof body === "object" &&
      body !== null &&
      "events" in body &&
      Array.isArray(body.events)
        ? body.events
        : [];
    await ctx.runMutation(internal.line.ingest.ingestEvents, { events });

    return Response.json({ status: "ok" });
  }),
  method: "POST",
  path: "/line/webhook",
});

export default http;

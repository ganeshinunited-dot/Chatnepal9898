import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("KarkTech product procedures", () => {
  it("exposes a public waitlist count", async () => {
    const result = await appRouter.createCaller(context()).waitlist.count();
    expect(typeof result).toBe("number");
  });

  it("rejects malformed waitlist email", async () => {
    await expect(appRouter.createCaller(context()).waitlist.join({ email: "not-an-email" })).rejects.toThrow();
  });

  it("exposes model discovery", async () => {
    const result = await appRouter.createCaller(context()).models();
    expect(Array.isArray(result)).toBe(true);
  });

  it("protects conversation creation", async () => {
    await expect(appRouter.createCaller(context()).chat.createConversation({ title: "Test" })).rejects.toThrow();
  });

  it("protects message retrieval", async () => {
    await expect(appRouter.createCaller(context()).chat.messages({ conversationId: 1 })).rejects.toThrow();
  });

  it("protects chat send and validates the request path", async () => {
    await expect(appRouter.createCaller(context()).chat.send({ conversationId: 1, model: "np1-moni", content: "Namaste" })).rejects.toThrow();
  });

  it("rejects malformed chat.send payloads", async () => {
    await expect(appRouter.createCaller(context()).chat.send({ conversationId: 0, model: "", content: "" } as never)).rejects.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { IgniterAgentInMemoryAdapter } from "./memory.adapter";

const createAdapter = () => IgniterAgentInMemoryAdapter.create({ namespace: "test" });

describe("IgniterAgentInMemoryAdapter", () => {
  it("stores and retrieves working memory", async () => {
    const adapter = createAdapter();

    await adapter.updateWorkingMemory({
      scope: "chat",
      identifier: "chat-1",
      content: "Hello",
    });

    const memory = await adapter.getWorkingMemory({
      scope: "chat",
      identifier: "chat-1",
    });

    expect(memory?.content).toBe("Hello");
  });

  it("stores and retrieves messages", async () => {
    const adapter = createAdapter();

    await adapter.saveMessage({
      chatId: "chat-1",
      userId: "user-1",
      role: "user",
      content: "Hi",
      timestamp: new Date("2024-01-01"),
    });

    const messages = await adapter.getMessages({ chatId: "chat-1" });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("Hi");
  });

  it("stores and manages chat sessions", async () => {
    const adapter = createAdapter();

    await adapter.saveChat({
      chatId: "chat-1",
      userId: "user-1",
      title: "First",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      messageCount: 0,
    });

    const chat = await adapter.getChat("chat-1");
    expect(chat?.title).toBe("First");

    await adapter.updateChatTitle("chat-1", "Updated");
    const updated = await adapter.getChat("chat-1");
    expect(updated?.title).toBe("Updated");

    const chats = await adapter.getChats({ userId: "user-1" });
    expect(chats).toHaveLength(1);

    await adapter.deleteChat("chat-1");
    const deleted = await adapter.getChat("chat-1");
    expect(deleted).toBeNull();
  });
});

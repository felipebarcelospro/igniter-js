import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm } from "fs/promises";
import { IgniterAgentJSONFileAdapter } from "./json-file.adapter";

const TEST_DIR = "./test-memory-adapter";

describe("IgniterAgentJSONFileAdapter", () => {
  let adapter: IgniterAgentJSONFileAdapter;

  beforeEach(async () => {
    adapter = new IgniterAgentJSONFileAdapter({
      dataDir: TEST_DIR,
      namespace: "test",
      autoSync: true,
    });
    await adapter.connect();
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("lifecycle", () => {
    it("should connect and be ready", () => {
      expect(adapter.isConnected()).toBe(true);
    });

    it("should disconnect cleanly", async () => {
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });

    it("should sync data on disconnect", async () => {
      await adapter.updateWorkingMemory({
        scope: "test",
        identifier: "key1",
        content: "test data",
      });

      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);

      // Reconnect should load the data
      const adapter2 = new IgniterAgentJSONFileAdapter({
        dataDir: TEST_DIR,
        namespace: "test",
      });
      await adapter2.connect();

      const memory = await adapter2.getWorkingMemory({
        scope: "test",
        identifier: "key1",
      });

      expect(memory?.content).toBe("test data");
      await adapter2.disconnect();
    });
  });

  describe("working memory", () => {
    it("should store and retrieve working memory", async () => {
      await adapter.updateWorkingMemory({
        scope: "chat",
        identifier: "chat_123",
        content: "User prefers TypeScript",
      });

      const memory = await adapter.getWorkingMemory({
        scope: "chat",
        identifier: "chat_123",
      });

      expect(memory?.content).toBe("User prefers TypeScript");
      expect(memory?.updatedAt).toBeInstanceOf(Date);
    });

    it("should return null for non-existent memory", async () => {
      const memory = await adapter.getWorkingMemory({
        scope: "chat",
        identifier: "nonexistent",
      });

      expect(memory).toBeNull();
    });

    it("should update existing memory", async () => {
      await adapter.updateWorkingMemory({
        scope: "chat",
        identifier: "chat_123",
        content: "First version",
      });

      let memory = await adapter.getWorkingMemory({
        scope: "chat",
        identifier: "chat_123",
      });
      expect(memory?.content).toBe("First version");

      await adapter.updateWorkingMemory({
        scope: "chat",
        identifier: "chat_123",
        content: "Updated version",
      });

      memory = await adapter.getWorkingMemory({
        scope: "chat",
        identifier: "chat_123",
      });
      expect(memory?.content).toBe("Updated version");
    });
  });

  describe("messages", () => {
    it("should save and retrieve messages", async () => {
      const message1 = {
        chatId: "chat_123",
        userId: "user_456",
        role: "user" as const,
        content: "Hello",
        timestamp: new Date(),
      };

      await adapter.saveMessage(message1);

      const messages = await adapter.getMessages({
        chatId: "chat_123",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello");
      expect(messages[0].role).toBe("user");
    });

    it("should filter messages by userId", async () => {
      await adapter.saveMessage({
        chatId: "chat_123",
        userId: "user_1",
        role: "user",
        content: "Message from user 1",
        timestamp: new Date(),
      });

      await adapter.saveMessage({
        chatId: "chat_123",
        userId: "user_2",
        role: "user",
        content: "Message from user 2",
        timestamp: new Date(),
      });

      const messages = await adapter.getMessages({
        chatId: "chat_123",
        userId: "user_1",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Message from user 1");
    });

    it("should limit messages", async () => {
      for (let i = 0; i < 10; i++) {
        await adapter.saveMessage({
          chatId: "chat_123",
          userId: "user_456",
          role: "user",
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const messages = await adapter.getMessages({
        chatId: "chat_123",
        limit: 3,
      });

      expect(messages).toHaveLength(3);
      expect(messages[messages.length - 1].content).toBe("Message 9");
    });
  });

  describe("chat sessions", () => {
    it("should save and retrieve chat", async () => {
      const chat = {
        chatId: "chat_123",
        userId: "user_456",
        title: "TypeScript Help",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 5,
      };

      await adapter.saveChat(chat);

      const retrieved = await adapter.getChat("chat_123");
      expect(retrieved?.title).toBe("TypeScript Help");
      expect(retrieved?.messageCount).toBe(5);
    });

    it("should update chat title", async () => {
      await adapter.saveChat({
        chatId: "chat_123",
        userId: "user_456",
        title: "Original Title",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });

      await adapter.updateChatTitle("chat_123", "Updated Title");

      const chat = await adapter.getChat("chat_123");
      expect(chat?.title).toBe("Updated Title");
    });

    it("should delete chat and messages", async () => {
      await adapter.saveChat({
        chatId: "chat_123",
        userId: "user_456",
        title: "Test Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });

      await adapter.saveMessage({
        chatId: "chat_123",
        userId: "user_456",
        role: "user",
        content: "Test message",
        timestamp: new Date(),
      });

      await adapter.deleteChat("chat_123");

      const chat = await adapter.getChat("chat_123");
      expect(chat).toBeNull();
    });

    it("should query chats by userId", async () => {
      await adapter.saveChat({
        chatId: "chat_1",
        userId: "user_1",
        title: "Chat 1",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });

      await adapter.saveChat({
        chatId: "chat_2",
        userId: "user_2",
        title: "Chat 2",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });

      const chats = await adapter.getChats({ userId: "user_1" });
      expect(chats).toHaveLength(1);
      expect(chats[0].title).toBe("Chat 1");
    });

    it("should search chats by title", async () => {
      await adapter.saveChat({
        chatId: "chat_1",
        userId: "user_1",
        title: "TypeScript Help",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });

      await adapter.saveChat({
        chatId: "chat_2",
        userId: "user_1",
        title: "React Questions",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });

      const chats = await adapter.getChats({
        userId: "user_1",
        search: "TypeScript",
      });

      expect(chats).toHaveLength(1);
      expect(chats[0].title).toBe("TypeScript Help");
    });
  });

  describe("stats", () => {
    it("should return storage stats", async () => {
      await adapter.updateWorkingMemory({
        scope: "test",
        identifier: "key1",
        content: "data",
      });

      await adapter.saveMessage({
        chatId: "chat_123",
        userId: "user_456",
        role: "user",
        content: "Message",
        timestamp: new Date(),
      });

      await adapter.saveChat({
        chatId: "chat_123",
        userId: "user_456",
        title: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 1,
      });

      const stats = await adapter.getStats();
      expect(stats.workingMemoryCount).toBe(1);
      expect(stats.messageCount).toBe(1);
      expect(stats.chatCount).toBe(1);
    });
  });

  describe("clear", () => {
    it("should clear all data", async () => {
      await adapter.updateWorkingMemory({
        scope: "test",
        identifier: "key1",
        content: "data",
      });

      await adapter.saveMessage({
        chatId: "chat_123",
        userId: "user_456",
        role: "user",
        content: "Message",
        timestamp: new Date(),
      });

      await adapter.clear();

      const stats = await adapter.getStats();
      expect(stats.workingMemoryCount).toBe(0);
      expect(stats.messageCount).toBe(0);
      expect(stats.chatCount).toBe(0);
    });
  });

  describe("persistence", () => {
    it("should persist data across adapter instances", async () => {
      await adapter.updateWorkingMemory({
        scope: "test",
        identifier: "key1",
        content: "persistent data",
      });

      await adapter.saveChat({
        chatId: "chat_123",
        userId: "user_456",
        title: "Test Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      });

      await adapter.saveMessage({
        chatId: "chat_123",
        userId: "user_456",
        role: "user",
        content: "Test message",
        timestamp: new Date(),
      });

      await adapter.disconnect();

      // Create new adapter instance
      const adapter2 = new IgniterAgentJSONFileAdapter({
        dataDir: TEST_DIR,
        namespace: "test",
      });
      await adapter2.connect();

      // Verify data persisted
      const memory = await adapter2.getWorkingMemory({
        scope: "test",
        identifier: "key1",
      });
      expect(memory?.content).toBe("persistent data");

      const chat = await adapter2.getChat("chat_123");
      expect(chat?.title).toBe("Test Chat");

      const messages = await adapter2.getMessages({ chatId: "chat_123" });
      expect(messages).toHaveLength(1);

      await adapter2.disconnect();
    });
  });
});

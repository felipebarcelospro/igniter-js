import { describe, expect, it, vi } from "vitest";
import { createIgniterController } from "./controller.service";
import { createIgniterMutation, createIgniterQuery } from "./action.service";
import { createServerCaller } from "./caller.server.service";

const createControllers = () => {
  const listAction = createIgniterQuery({
    path: "",
    handler: async () => ({ ok: true }),
  });

  const createAction = createIgniterMutation({
    path: "",
    method: "POST",
    handler: async () => ({ created: true }),
  });

  const controller = createIgniterController({
    name: "users",
    path: "users",
    actions: {
      list: listAction,
      create: createAction,
    },
  });

  return { users: controller };
};

describe("createServerCaller", () => {
  it("invokes processor.call for query actions", async () => {
    const controllers = createControllers();
    const processor = {
      call: vi.fn().mockResolvedValue({ ok: true }),
    } as any;

    const caller = createServerCaller(controllers, processor);

    const result = await caller.users.list.query({} as any);

    expect(processor.call).toHaveBeenCalledWith(
      "users",
      "list",
      expect.any(Object),
      expect.any(Object),
    );
    expect(result).toEqual({ ok: true });
  });

  it("invokes processor.call for mutation actions", async () => {
    const controllers = createControllers();
    const processor = {
      call: vi.fn().mockResolvedValue({ created: true }),
    } as any;

    const caller = createServerCaller(controllers, processor);

    const result = await caller.users.create.mutate({} as any);

    expect(processor.call).toHaveBeenCalledWith(
      "users",
      "create",
      expect.any(Object),
      expect.any(Object),
    );
    expect(result).toEqual({ created: true });
  });

  it("throws when controller is missing", () => {
    const controllers = createControllers();
    const processor = { call: vi.fn() } as any;
    const caller = createServerCaller(controllers, processor);

    expect(() => (caller as any).missing).toThrow(
      'Controller "missing" not found in router.',
    );
  });
});

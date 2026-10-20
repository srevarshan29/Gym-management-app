import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberWaterLogsRepository } from "@/lib/firestore/repositories/member-water-logs";
import type { MemberWaterLogDoc } from "@/lib/firestore/types";
import { platformContext } from "@/lib/firestore/helpers";

const OPERATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_OPERATION_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const GYM_ID = "gym-a";
const MEMBER_ID = "m1";
const LOG_DATE = "2026-10-11";

type MemoryOptions = {
  /** Fail every list query (pre- and post-write). */
  listAlwaysFails?: boolean;
  /** Fail list queries starting from this 1-based call (earlier calls succeed). */
  failListFromAttempt?: number;
};

function buildInMemoryWaterLogsDb(options: MemoryOptions = {}) {
  const docs = new Map<string, MemberWaterLogDoc & { id: string }>();
  let createCalls = 0;
  let listCalls = 0;

  const listMatching = () =>
    [...docs.values()].filter(
      (d) =>
        d.gymId === GYM_ID &&
        d.memberId === MEMBER_ID &&
        d.logDate === LOG_DATE,
    );

  const collection = () => ({
    where: () => ({
      where: () => ({
        where: () => ({
          get: async () => {
            listCalls += 1;
            const shouldFail =
              options.listAlwaysFails ||
              (options.failListFromAttempt != null &&
                listCalls >= options.failListFromAttempt);
            if (shouldFail) {
              throw new Error(
                "9 FAILED_PRECONDITION: The query requires an index.",
              );
            }
            return {
              docs: listMatching().map((data) => ({
                id: data.id,
                data: () => data,
              })),
            };
          },
        }),
      }),
    }),
  });

  const db = {
    collection: (name: string) => {
      if (name !== "memberWaterLogs") {
        throw new Error(`unexpected collection ${name}`);
      }
      return {
        doc: (id: string) => ({
          get: async () => {
            const data = docs.get(id);
            return {
              exists: data != null,
              data: () => data,
            };
          },
          create: async (payload: MemberWaterLogDoc) => {
            createCalls += 1;
            if (docs.has(id)) {
              const err = new Error("already exists") as Error & { code: number };
              err.code = 6;
              throw err;
            }
            docs.set(id, { id, ...payload });
          },
        }),
        ...collection(),
      };
    },
  };

  return {
    db: db as never,
    docs,
    getCreateCalls: () => createCalls,
    getListCalls: () => listCalls,
  };
}

describe("MemberWaterLogsRepository.addEntry idempotency", () => {
  let memory: ReturnType<typeof buildInMemoryWaterLogsDb>;

  beforeEach(() => {
    memory = buildInMemoryWaterLogsDb();
  });

  it("persists a new entry and returns the summed daily total", async () => {
    const repo = new MemberWaterLogsRepository(memory.db);
    const ctx = platformContext;

    memory.docs.set(OTHER_OPERATION_ID, {
      id: OTHER_OPERATION_ID,
      gymId: GYM_ID,
      memberId: MEMBER_ID,
      logDate: LOG_DATE,
      amountMl: 300,
      createdAt: Timestamp.fromDate(new Date("2026-10-11T07:00:00Z")),
    });

    const result = await repo.addEntry(
      ctx,
      GYM_ID,
      MEMBER_ID,
      LOG_DATE,
      250,
      OPERATION_ID,
    );

    expect(result.totalMl).toBe(550);
    expect(memory.getCreateCalls()).toBe(1);
    expect(memory.docs.size).toBe(2);
  });

  it("increases total once when the same operationId is retried after a lost response", async () => {
    const repo = new MemberWaterLogsRepository(memory.db);
    const ctx = platformContext;

    const first = await repo.addEntry(
      ctx,
      GYM_ID,
      MEMBER_ID,
      LOG_DATE,
      250,
      OPERATION_ID,
    );
    expect(first.totalMl).toBe(250);
    expect(memory.getCreateCalls()).toBe(1);

    const retry = await repo.addEntry(
      ctx,
      GYM_ID,
      MEMBER_ID,
      LOG_DATE,
      250,
      OPERATION_ID,
    );
    expect(retry.totalMl).toBe(250);
    expect(memory.getCreateCalls()).toBe(1);
    expect(memory.docs.size).toBe(1);
  });

  it("returns existing total when the operation row is already stored", async () => {
    const repo = new MemberWaterLogsRepository(memory.db);
    const ctx = platformContext;
    memory.docs.set(OPERATION_ID, {
      id: OPERATION_ID,
      gymId: GYM_ID,
      memberId: MEMBER_ID,
      logDate: LOG_DATE,
      amountMl: 250,
      createdAt: Timestamp.fromDate(new Date("2026-10-11T08:00:00Z")),
    });

    const result = await repo.addEntry(
      ctx,
      GYM_ID,
      MEMBER_ID,
      LOG_DATE,
      250,
      OPERATION_ID,
    );
    expect(result.totalMl).toBe(250);
    expect(memory.getCreateCalls()).toBe(0);
    expect(memory.docs.size).toBe(1);
  });

  it("resolves without throwing when every list query fails on an empty day", async () => {
    memory = buildInMemoryWaterLogsDb({ listAlwaysFails: true });
    const repo = new MemberWaterLogsRepository(memory.db);
    const ctx = platformContext;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await repo.addEntry(
      ctx,
      GYM_ID,
      MEMBER_ID,
      LOG_DATE,
      250,
      OPERATION_ID,
    );

    expect(result.totalMl).toBe(250);
    expect(memory.getCreateCalls()).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns prior daily total plus new amount when post-write list lookup fails", async () => {
    memory = buildInMemoryWaterLogsDb({ failListFromAttempt: 2 });
    const repo = new MemberWaterLogsRepository(memory.db);
    const ctx = platformContext;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    memory.docs.set(OTHER_OPERATION_ID, {
      id: OTHER_OPERATION_ID,
      gymId: GYM_ID,
      memberId: MEMBER_ID,
      logDate: LOG_DATE,
      amountMl: 300,
      createdAt: Timestamp.fromDate(new Date("2026-10-11T07:00:00Z")),
    });

    const result = await repo.addEntry(
      ctx,
      GYM_ID,
      MEMBER_ID,
      LOG_DATE,
      250,
      OPERATION_ID,
    );

    expect(result.totalMl).toBe(550);
    expect(memory.getCreateCalls()).toBe(1);
    expect(memory.getListCalls()).toBeGreaterThanOrEqual(2);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

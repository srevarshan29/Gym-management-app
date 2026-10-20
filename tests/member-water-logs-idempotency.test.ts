import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberWaterLogsRepository } from "@/lib/firestore/repositories/member-water-logs";
import type { MemberWaterLogDoc } from "@/lib/firestore/types";
import { platformContext } from "@/lib/firestore/helpers";

const OPERATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const GYM_ID = "gym-a";
const MEMBER_ID = "m1";
const LOG_DATE = "2026-10-11";

function buildInMemoryWaterLogsDb() {
  const docs = new Map<string, MemberWaterLogDoc & { id: string }>();
  let createCalls = 0;

  const collection = () => ({
    where: () => ({
      where: () => ({
        where: () => ({
          aggregate: () => ({
            get: async () => ({
              data: () => ({
                totalMl: [...docs.values()]
                  .filter(
                    (d) =>
                      d.gymId === GYM_ID &&
                      d.memberId === MEMBER_ID &&
                      d.logDate === LOG_DATE,
                  )
                  .reduce((sum, d) => sum + d.amountMl, 0),
              }),
            }),
          }),
          get: async () => ({
            docs: [...docs.entries()].map(([id, data]) => ({
              id,
              data: () => data,
            })),
          }),
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

  return { db: db as never, docs, getCreateCalls: () => createCalls };
}

describe("MemberWaterLogsRepository.addEntry idempotency", () => {
  let memory: ReturnType<typeof buildInMemoryWaterLogsDb>;

  beforeEach(() => {
    memory = buildInMemoryWaterLogsDb();
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
});

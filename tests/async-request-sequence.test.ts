import { describe, expect, it } from "vitest";

import { AsyncRequestSequence } from "@/lib/async/request-sequence";

describe("AsyncRequestSequence", () => {
  it("ignores an older response that arrives after a newer response", async () => {
    const seq = new AsyncRequestSequence();
    let visible: string[] = [];

    async function run(label: string, delayMs: number) {
      const id = seq.start();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!seq.isCurrent(id)) return;
      visible = [label];
    }

    await Promise.all([run("older", 30), run("newer", 5)]);

    expect(visible).toEqual(["newer"]);
  });

  it("keeps the newer response visible when both complete", async () => {
    const seq = new AsyncRequestSequence();
    let visible = "initial";

    async function run(label: string, delayMs: number) {
      const id = seq.start();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!seq.isCurrent(id)) return;
      visible = label;
    }

    await Promise.all([run("first", 10), run("second", 20)]);

    expect(visible).toBe("second");
  });

  it("handles rapid query changes by honoring only the latest request", async () => {
    const seq = new AsyncRequestSequence();
    const completions: string[] = [];

    async function run(label: string, delayMs: number) {
      const id = seq.start();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!seq.isCurrent(id)) return;
      completions.push(label);
    }

    await Promise.all([
      run("a", 25),
      run("b", 15),
      run("c", 5),
    ]);

    expect(completions).toEqual(["c"]);
  });

  it("treats an empty-query completion as current when it is the latest request", async () => {
    const seq = new AsyncRequestSequence();
    let visible: string[] = ["seed"];

    async function run(query: string, delayMs: number) {
      const id = seq.start();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!seq.isCurrent(id)) return;
      visible = query ? [query] : [];
    }

    await run("", 5);

    expect(visible).toEqual([]);
  });

  it("does not let an older error overwrite a newer successful result", async () => {
    const seq = new AsyncRequestSequence();
    let visible: string[] = ["seed"];
    let error: string | null = null;

    async function run(
      label: string,
      delayMs: number,
      mode: "success" | "error",
    ) {
      const id = seq.start();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!seq.isCurrent(id)) return;
      if (mode === "error") {
        error = `${label}-error`;
        visible = [];
        return;
      }
      error = null;
      visible = [label];
    }

    await Promise.all([
      run("old", 30, "error"),
      run("new", 5, "success"),
    ]);

    expect(visible).toEqual(["new"]);
    expect(error).toBeNull();
  });

  it("lets pagination append use the current request id without starting a new one", () => {
    const seq = new AsyncRequestSequence();
    const baseId = seq.start();
    const appendId = seq.current();

    expect(appendId).toBe(baseId);
    expect(seq.isCurrent(appendId)).toBe(true);

    seq.start();
    expect(seq.isCurrent(appendId)).toBe(false);
  });
});

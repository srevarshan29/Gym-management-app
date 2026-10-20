import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("MemberDashboardMetricCardsLive water live sync", () => {
  const liveSource = readFileSync(
    resolve(
      "src/components/member-portal/dashboard/member-dashboard-metric-cards-live.tsx",
    ),
    "utf8",
  );

  const waterLiveSource = readFileSync(
    resolve(
      "src/components/member-portal/dashboard/member-dashboard-water-live.tsx",
    ),
    "utf8",
  );

  it("stabilizes onWaterProgress with useCallback (avoids metric-cards effect loop)", () => {
    expect(liveSource).toContain("useCallback");
    expect(liveSource).toMatch(/const onWaterProgress = useCallback\(/);
    expect(liveSource).not.toMatch(
      /onWaterProgress=\{\(progress\) => setLiveWater\(progress\)\}/,
    );
    expect(liveSource).not.toMatch(
      /onWaterProgress=\{\(progress\) =>\s*\n?\s*setLiveWater\(progress\)/,
    );
  });

  it("skips redundant setLiveWater when progress values are unchanged", () => {
    expect(liveSource).toContain("setLiveWater((prev)");
    expect(liveSource).toMatch(
      /prev\.consumedMl === progress\.consumedMl[\s\S]*prev\.percent === progress\.percent[\s\S]*prev\.goalComplete === progress\.goalComplete/,
    );
    expect(liveSource).toMatch(/\? prev\s*:\s*progress/);
  });

  it("exposes setLiveWater as a React state dispatcher for functional updates", () => {
    expect(waterLiveSource).toContain(
      "React.Dispatch<React.SetStateAction<LiveWaterProgress>>",
    );
  });
});

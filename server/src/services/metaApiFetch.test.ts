import { describe, expect, it } from "@jest/globals";
import { maxEstimatedTimeToRegainAccessFromUsageJson, parseBusinessUseCaseUsageHeader } from "./metaApiFetch";

describe("metaApiFetch — x-business-use-case-usage", () => {
  it("parsuje zagnieżdżony JSON i zwraca max estimated_time_to_regain_access", () => {
    const header = JSON.stringify({
      "123456789": {
        business_use_case: {
          manage_business_extension: [
            {
              type: "pages",
              call_count: 2,
              total_time: 2,
              total_cputime: 2,
              estimated_time_to_regain_access: 0,
            },
          ],
        },
      },
      other: {
        business_use_case: {
          ads: [
            {
              estimated_time_to_regain_access: 12,
            },
          ],
        },
      },
    });

    expect(parseBusinessUseCaseUsageHeader(header)).toEqual({ regainSeconds: 12 });
  });

  it("maxEstimatedTimeToRegainAccessFromUsageJson zbiera liczby z całego drzewa", () => {
    const regain = maxEstimatedTimeToRegainAccessFromUsageJson({
      a: [{ estimated_time_to_regain_access: 5 }],
      b: { nested: { estimated_time_to_regain_access: 9 } },
    });
    expect(regain).toBe(9);
  });

  it("pusty lub niepoprawny nagłówek → 0", () => {
    expect(parseBusinessUseCaseUsageHeader(null)).toEqual({ regainSeconds: 0 });
    expect(parseBusinessUseCaseUsageHeader("")).toEqual({ regainSeconds: 0 });
    expect(parseBusinessUseCaseUsageHeader("not-json")).toEqual({ regainSeconds: 0 });
  });
});

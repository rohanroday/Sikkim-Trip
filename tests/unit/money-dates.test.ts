import { describe, expect, it } from "vitest";
import { commissionFor, formatINR, rupeesToPaise } from "@/lib/money";
import { addDays, diffDays, isNightDate, istStartOfDay, nightsBetween, todayIST } from "@/lib/dates";
import { maskIdNumber } from "@/lib/permits/permits";
import { normalizePhone, maskPhone } from "@/lib/phone";

describe("money", () => {
  it("formats with Indian grouping", () => {
    expect(formatINR(rupeesToPaise(125000))).toBe("₹1,25,000");
    expect(formatINR(rupeesToPaise(6500))).toBe("₹6,500");
    expect(formatINR(1050)).toBe("₹10.50");
  });

  it("rounds commission once, half-up, to whole paise", () => {
    expect(commissionFor(100000, 10)).toBe(10000);
    expect(commissionFor(15, 10)).toBe(2); // 1.5 -> 2
    expect(commissionFor(14, 10)).toBe(1); // 1.4 -> 1
    expect(commissionFor(1005, 10.5)).toBe(106); // 105.525 -> 106
    expect(commissionFor(0, 12)).toBe(0);
  });

  it("rejects non-integer paise", () => {
    expect(() => commissionFor(10.5, 10)).toThrow();
  });
});

describe("dates (IST)", () => {
  it("uses IST for today, not server time", () => {
    // 2026-10-16 19:00 UTC is already 17 Oct in India.
    expect(todayIST(new Date("2026-10-16T19:00:00Z"))).toBe("2026-10-17");
    expect(todayIST(new Date("2026-10-16T18:29:59Z"))).toBe("2026-10-16");
  });

  it("computes nights and day differences across month and year ends", () => {
    expect(nightsBetween("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
    expect(nightsBetween("2026-10-10", "2026-10-10")).toEqual([]);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(diffDays("2026-10-16", "2026-11-01")).toBe(16);
  });

  it("validates night dates", () => {
    expect(isNightDate("2026-02-30")).toBe(false);
    expect(isNightDate("2026-2-3")).toBe(false);
    expect(isNightDate("2026-10-16")).toBe(true);
  });

  it("finds midnight IST as a UTC instant", () => {
    expect(istStartOfDay("2026-10-17").toISOString()).toBe("2026-10-16T18:30:00.000Z");
  });
});

describe("personal data helpers", () => {
  it("keeps only the last 4 characters of an ID number", () => {
    expect(maskIdNumber("1234 5678 9012")).toBe("9012");
  });
  it("normalises and masks phones", () => {
    expect(normalizePhone("98123 45678")).toBe("+919812345678");
    expect(normalizePhone("+91 98123-45678")).toBe("+919812345678");
    expect(normalizePhone("12345")).toBeNull();
    expect(maskPhone("+919812345678")).not.toContain("98123");
  });
});

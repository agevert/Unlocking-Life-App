import { describe, expect, it } from "vitest";
import {
  addDays, dayOfQuarter, defaultReviewWeek, isWeekId, quarterFromKey, quarterOf, quarterOfWeek,
  quarterPace, quarterWeeks, shiftQuarter, shiftWeek, todayIn, weekIdOf, weekMonday, weekRange, weekday,
} from "./week";

describe("ISO weeks", () => {
  it("numbers weeks per ISO 8601", () => {
    expect(weekIdOf("2026-10-12")).toBe("2026-W42");
    expect(weekIdOf("2026-10-11")).toBe("2026-W41");
    expect(weekIdOf("2026-12-31")).toBe("2026-W53");
    expect(weekIdOf("2027-01-03")).toBe("2026-W53");
    expect(weekIdOf("2027-01-04")).toBe("2027-W01");
    expect(weekIdOf("2021-01-01")).toBe("2020-W53");
  });
  it("finds Mondays and shifts across years", () => {
    expect(weekMonday("2026-W41")).toBe("2026-10-05");
    expect(weekMonday("2027-W01")).toBe("2027-01-04");
    expect(shiftWeek("2026-W53", 1)).toBe("2027-W01");
    expect(shiftWeek("2027-W01", -1)).toBe("2026-W53");
  });
  it("validates week ids", () => {
    expect(isWeekId("2026-W53")).toBe(true);
    expect(isWeekId("2027-W53")).toBe(false);
    expect(isWeekId("2026-W00")).toBe(false);
    expect(isWeekId("nonsense")).toBe(false);
  });
  it("is immune to daylight saving changes", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
  });
  it("formats ranges", () => {
    expect(weekRange("2026-W41")).toBe("5 Oct – 11 Oct");
  });
});

describe("review week", () => {
  it("reviews last week early in the week and this week from Friday", () => {
    expect(weekday("2026-10-12")).toBe(0);
    expect(defaultReviewWeek("2026-10-12")).toBe("2026-W41");
    expect(defaultReviewWeek("2026-10-15")).toBe("2026-W41");
    expect(defaultReviewWeek("2026-10-16")).toBe("2026-W42");
    expect(defaultReviewWeek("2026-10-18")).toBe("2026-W42");
  });
});

describe("quarters", () => {
  it("computes bounds and pace", () => {
    const q = quarterOf("2026-10-12");
    expect(q.key).toBe("2026-Q4");
    expect(q.start).toBe("2026-10-01");
    expect(q.end).toBe("2026-12-31");
    expect(q.days).toBe(92);
    expect(dayOfQuarter("2026-10-12", q)).toBe(12);
    expect(quarterPace("2026-12-31", q)).toBe(1);
    expect(quarterFromKey("2028-Q1").days).toBe(91);
  });
  it("assigns weeks to quarters by their Thursday", () => {
    expect(quarterOfWeek("2026-W40").key).toBe("2026-Q4");
    expect(quarterOfWeek("2026-W53").key).toBe("2026-Q4");
    const weeks = quarterWeeks(quarterOf("2026-11-01"));
    expect(weeks[0]).toBe("2026-W40");
    expect(weeks.at(-1)).toBe("2026-W53");
    expect(weeks).toHaveLength(14);
  });
  it("shifts quarters across years", () => {
    expect(shiftQuarter("2026-Q4", 1)).toBe("2027-Q1");
    expect(shiftQuarter("2026-Q1", -1)).toBe("2025-Q4");
  });
  it("reads today in a time zone", () => {
    const late = new Date("2026-10-11T23:30:00Z");
    expect(todayIn("Europe/Berlin", late)).toBe("2026-10-12");
    expect(todayIn("America/Santiago", late)).toBe("2026-10-11");
  });
});

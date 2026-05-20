import { getSlots } from "./index";
import moment from "moment-timezone";

describe("getSlots", () => {
  it("finds available slots without Google Calendar credentials", async () => {
    const result = await getSlots({
      slotDuration: 30,
      from: moment.utc("2030-01-01T00:00:00Z"),
      to: moment.utc("2030-01-01T23:59:59Z"),
      daily: {
        timezone: "UTC",
        from: [9],
        to: [11],
      },
    });

    // Current slot bounds are exclusive, so a 09:00-11:00 window starts at 09:30.
    expect(result.map((slot) => moment.utc(slot.start).format("HH:mm"))).toEqual([
      "09:30",
      "10:00",
    ]);
    expect(result.map((slot) => moment.utc(slot.end).format("HH:mm"))).toEqual([
      "10:00",
      "10:30",
    ]);
  });
});

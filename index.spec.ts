import fs from "fs";
import os from "os";
import path from "path";
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

  it("finds available slots from a local iCalendar file", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "calendar-slots-"));
    const file = path.join(directory, "calendar.ics");
    fs.writeFileSync(
      file,
      `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//calendar-slots//test//EN
BEGIN:VEVENT
UID:local-file-test@example.com
DTSTAMP:20300101T000000Z
DTSTART:20300101T101500Z
DTEND:20300101T104500Z
SUMMARY:Busy from local file
END:VEVENT
END:VCALENDAR
`
    );

    try {
      const result = await getSlots({
        file,
        slotDuration: 30,
        from: moment.utc("2030-01-01T00:00:00Z"),
        to: moment.utc("2030-01-01T23:59:59Z"),
        daily: {
          timezone: "UTC",
          from: [9],
          to: [12],
        },
      });

      expect(result.map((slot) => moment.utc(slot.start).format("HH:mm"))).toEqual([
        "09:30",
        "11:00",
      ]);
    } finally {
      fs.unlinkSync(file);
      fs.rmdirSync(directory);
    }
  });
});

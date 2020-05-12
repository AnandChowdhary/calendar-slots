import { getSlots } from "./index";
import moment from "moment-timezone";

const test = async () => {
  const result = await getSlots({
    slotDuration: 30,
    log: true,
    slots: 3,
    from: moment(),
    to: moment().add(1, "day").endOf("day"),
    days: [1, 2, 3, 4, 5],
    calendarId: "primary",
    daily: {
      timezone: "Asia/Kolkata",
      from: [12],
      to: [16],
    },
  });
  console.log(
    "RESULT",
    result.map((i) => i.start.toLocaleString())
  );
};

test();

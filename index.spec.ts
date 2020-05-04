import { getSlots } from "./index";

const test = async () => {
  const result = await getSlots({
    slotDuration: 30,
    log: true,
    slots: 3,
    from: new Date(),
    to: new Date("2020-05-10"),
    days: [1, 2, 3, 4, 5],
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

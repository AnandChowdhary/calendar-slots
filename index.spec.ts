import { getSlots } from "./index";

describe("node.ts", () => {
  it("works", async () => {
    expect(await getSlots()).toBeTruthy();
  });
});

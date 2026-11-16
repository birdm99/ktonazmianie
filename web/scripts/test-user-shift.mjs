import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.PB_URL || "http://127.0.0.1:8091");
const password = process.env.PB_PASSWORD;
if (!password) {
  console.error("PB_PASSWORD required");
  process.exit(1);
}

const user = (await pb.collection("users").authWithPassword("test@test.pl", password)).record;

const types = await pb.collection("shift_types").getFullList();
const calendar = user.calendar || types[0].calendar;
if (!calendar) {
  console.error("Brak pola calendar.");
  process.exit(1);
}

const created = await pb.collection("shifts").create({
  user: user.id,
  date: "2026-11-24 00:00:00.000Z",
  shiftType: types[0].id,
  calendar,
  startTime: "08:00",
  endTime: "16:00",
});
console.log("user created", created.id);
console.log("list count", (await pb.collection("shifts").getFullList()).length);

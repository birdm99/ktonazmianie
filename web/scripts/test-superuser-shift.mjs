import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.PB_URL || "http://127.0.0.1:8091");

const identity = process.env.PB_SUPERUSER || "devtest@example.com";
const password = process.env.PB_SUPERUSER_PASSWORD || "DevTestPass123!";

await pb.collection("_superusers").authWithPassword(identity, password);

const users = await pb.collection("users").getFullList();
const types = await pb.collection("shift_types").getFullList();

const calendar = users[0].calendar || types[0]?.calendar;
if (!calendar) {
  console.error("Brak pola calendar na użytkowniku lub typie zmiany.");
  process.exit(1);
}

const body = {
  user: users[0].id,
  date: "2026-11-23 00:00:00.000Z",
  shiftType: types[0].id,
  calendar,
  startTime: "09:00",
  endTime: "17:00",
};

const created = await pb.collection("shifts").create(body);
console.log("created", created.id);

const list = await pb.collection("shifts").getFullList();
console.log("total shifts", list.length);

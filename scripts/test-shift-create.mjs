import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.PB_URL || "http://127.0.0.1:8091");

const identity = process.env.PB_USER || "test@test.pl";
const password = process.env.PB_PASSWORD;
if (!password) {
  console.error("Ustaw PB_PASSWORD (hasło użytkownika aplikacji).");
  process.exit(1);
}

const user = (await pb.collection("users").authWithPassword(identity, password)).record;
const types = await pb.collection("shift_types").getFullList();
if (!types.length) {
  console.error("Brak typów zmian w bazie.");
  process.exit(1);
}

const calendar = user.calendar || types[0].calendar;
if (!calendar) {
  console.error("Brak pola calendar na użytkowniku lub typie zmiany.");
  process.exit(1);
}

const body = {
  user: user.id,
  date: "2026-11-22 00:00:00.000Z",
  shiftType: types[0].id,
  calendar,
  startTime: "08:00",
  endTime: "16:00",
};

try {
  const created = await pb.collection("shifts").create(body);
  console.log("OK utworzono:", created.id, created.date);
} catch (e) {
  console.error("Błąd create:", e?.response ?? e);
  process.exit(1);
}

const list = await pb.collection("shifts").getFullList();
console.log("Liczba zmian po zapisie:", list.length);

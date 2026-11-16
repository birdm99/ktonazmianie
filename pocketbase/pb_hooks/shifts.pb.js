/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  const record = e.record;
  if (!record.get("calendar")) {
    const userId = record.get("user");
    if (userId) {
      try {
        const user = $app.findRecordById("users", userId);
        const cal = user.get("calendar");
        if (cal) record.set("calendar", cal);
      } catch (_) {
        /* ignore */
      }
    }
  }
  e.next();
}, "shifts");

onRecordUpdateRequest((e) => {
  const record = e.record;
  const userId = record.get("user");
  if (!userId) {
    e.next();
    return;
  }
  let userCalendar = "";
  try {
    userCalendar = $app.findRecordById("users", userId).get("calendar") || "";
  } catch (_) {
    e.next();
    return;
  }
  const shiftCalendar = record.get("calendar");
  if (shiftCalendar && userCalendar && shiftCalendar !== userCalendar) {
    throw new BadRequestError("Kalendarz zmiany musi być zgodny z kalendarzem użytkownika.");
  }
  if (!shiftCalendar && userCalendar) {
    record.set("calendar", userCalendar);
  }
  e.next();
}, "shifts");
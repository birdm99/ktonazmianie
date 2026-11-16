/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const calendars = new Collection({
      name: "calendars",
      type: "base",
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
          min: 1,
          max: 200,
        },
        {
          name: "description",
          type: "text",
          required: false,
          max: 500,
        },
      ],
      listRule: '@request.auth.role = "superadmin" || id = @request.auth.calendar',
      viewRule: '@request.auth.role = "superadmin" || id = @request.auth.calendar',
      createRule: '@request.auth.role = "superadmin"',
      updateRule: '@request.auth.role = "superadmin"',
      deleteRule: '@request.auth.role = "superadmin"',
    });
    app.save(calendars);

    const defaultCal = new Record(calendars);
    defaultCal.set("name", "Domyślny");
    defaultCal.set("description", "Kalendarz utworzony podczas migracji");
    app.save(defaultCal);
    const defaultCalId = defaultCal.id;

    const roleField = users.fields.getByName("role");
    roleField.values = ["employee", "admin", "superadmin"];

    users.fields.add(
      new RelationField({
        name: "calendar",
        required: false,
        collectionId: calendars.id,
        cascadeDelete: false,
        maxSelect: 1,
        minSelect: 0,
      })
    );

    users.listRule =
      '@request.auth.role = "superadmin" || (calendar != "" && calendar = @request.auth.calendar)';
    users.viewRule =
      '@request.auth.role = "superadmin" || (calendar != "" && calendar = @request.auth.calendar) || id = @request.auth.id';
    users.updateRule = 'id = @request.auth.id || @request.auth.role = "superadmin"';
    users.deleteRule = '@request.auth.role = "superadmin"';
    app.save(users);

    const shiftTypes = app.findCollectionByNameOrId("shift_types");
    shiftTypes.fields.add(
      new RelationField({
        name: "calendar",
        required: true,
        collectionId: calendars.id,
        cascadeDelete: false,
        maxSelect: 1,
        minSelect: 1,
      })
    );

    const shifts = app.findCollectionByNameOrId("shifts");
    shifts.fields.add(
      new RelationField({
        name: "calendar",
        required: true,
        collectionId: calendars.id,
        cascadeDelete: false,
        maxSelect: 1,
        minSelect: 1,
      })
    );

    app.save(shiftTypes);
    app.save(shifts);

    const allUsers = app.findAllRecords("users");
    for (const record of allUsers) {
      if (!record.get("calendar")) {
        record.set("calendar", defaultCalId);
        app.save(record);
      }
    }

    const allShiftTypes = app.findAllRecords("shift_types");
    for (const record of allShiftTypes) {
      record.set("calendar", defaultCalId);
      app.save(record);
    }

    const allShifts = app.findAllRecords("shifts");
    for (const record of allShifts) {
      let calId = record.get("calendar");
      if (!calId) {
        const userId = record.get("user");
        try {
          const userRec = app.findRecordById("users", userId);
          calId = userRec.get("calendar") || defaultCalId;
        } catch (_) {
          calId = defaultCalId;
        }
        record.set("calendar", calId);
        app.save(record);
      }
    }

    try {
      app.db().newQuery("DROP INDEX IF EXISTS idx_shifts_user_date").execute();
    } catch (_) {}
    try {
      app.db().newQuery(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_calendar_user_date ON shifts (calendar, user, date)"
      ).execute();
    } catch (_) {}

    shiftTypes.listRule =
      '@request.auth.role = "superadmin" || calendar = @request.auth.calendar';
    shiftTypes.viewRule =
      '@request.auth.role = "superadmin" || calendar = @request.auth.calendar';
    shiftTypes.createRule =
      '@request.auth.role = "superadmin" || (@request.auth.role = "admin" && @request.body.calendar = @request.auth.calendar)';
    shiftTypes.updateRule =
      '@request.auth.role = "superadmin" || (@request.auth.role = "admin" && calendar = @request.auth.calendar)';
    shiftTypes.deleteRule =
      '@request.auth.role = "superadmin" || (@request.auth.role = "admin" && calendar = @request.auth.calendar)';
    app.save(shiftTypes);

    const holidays = app.findCollectionByNameOrId("holidays");
    holidays.createRule = '@request.auth.role = "superadmin"';
    holidays.updateRule = '@request.auth.role = "superadmin"';
    holidays.deleteRule = '@request.auth.role = "superadmin"';
    app.save(holidays);

    shifts.listRule =
      '@request.auth.role = "superadmin" || calendar = @request.auth.calendar';
    shifts.viewRule =
      '@request.auth.role = "superadmin" || calendar = @request.auth.calendar';
    shifts.createRule =
      '@request.auth.role = "superadmin" || (@request.auth.id != "" && @request.body.calendar = @request.auth.calendar && (@request.auth.role = "admin" || @request.body.user = @request.auth.id))';
    shifts.updateRule =
      '@request.auth.role = "superadmin" || (calendar = @request.auth.calendar && (@request.auth.role = "admin" || user = @request.auth.id))';
    shifts.deleteRule =
      '@request.auth.role = "superadmin" || (calendar = @request.auth.calendar && (@request.auth.role = "admin" || user = @request.auth.id))';
    app.save(shifts);

    return;
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("calendars"));
    } catch (_) {}

    const shifts = app.findCollectionByNameOrId("shifts");
    shifts.fields.removeByName("calendar");
    shifts.listRule = '@request.auth.id != ""';
    shifts.viewRule = '@request.auth.id != ""';
    shifts.createRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || @request.body.user:each ?= @request.auth.id || @request.body.user ?= @request.auth.id)';
    shifts.updateRule = '@request.auth.role = "admin" || user ?= @request.auth.id';
    shifts.deleteRule = '@request.auth.role = "admin" || user ?= @request.auth.id';
    app.save(shifts);

    const shiftTypes = app.findCollectionByNameOrId("shift_types");
    shiftTypes.fields.removeByName("calendar");
    shiftTypes.listRule = '@request.auth.id != ""';
    shiftTypes.viewRule = '@request.auth.id != ""';
    shiftTypes.createRule = '@request.auth.role = "admin"';
    shiftTypes.updateRule = '@request.auth.role = "admin"';
    shiftTypes.deleteRule = '@request.auth.role = "admin"';
    app.save(shiftTypes);

    const holidays = app.findCollectionByNameOrId("holidays");
    holidays.createRule = '@request.auth.role = "admin"';
    holidays.updateRule = '@request.auth.role = "admin"';
    holidays.deleteRule = '@request.auth.role = "admin"';
    app.save(holidays);

    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("calendar");
    const roleField = users.fields.getByName("role");
    roleField.values = ["employee", "admin"];
    users.listRule = '@request.auth.id != ""';
    users.viewRule = '@request.auth.id != ""';
    users.updateRule = 'id = @request.auth.id || @request.auth.role = "admin"';
    users.deleteRule = '@request.auth.role = "admin"';
    app.save(users);
  }
);
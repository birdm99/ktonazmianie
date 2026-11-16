/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    users.fields.add(
      new TextField({
        name: "firstName",
        required: true,
        type: "text",
        min: 1,
        max: 100,
      }),
      new TextField({
        name: "lastName",
        required: true,
        type: "text",
        min: 1,
        max: 100,
      }),
      new SelectField({
        name: "role",
        required: true,
        type: "select",
        values: ["employee", "admin"],
        maxSelect: 1,
      })
    );

    users.listRule = '@request.auth.id != ""';
    users.viewRule = '@request.auth.id != ""';
    users.updateRule = 'id = @request.auth.id || @request.auth.role = "admin"';
    users.deleteRule = '@request.auth.role = "admin"';

    app.save(users);

    const shiftTypes = new Collection({
      name: "shift_types",
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
          name: "abbreviation",
          type: "text",
          required: true,
          min: 1,
          max: 10,
        },
        {
          name: "defaultStart",
          type: "text",
          required: false,
          max: 10,
        },
        {
          name: "defaultEnd",
          type: "text",
          required: false,
          max: 10,
        },
        {
          name: "isFree",
          type: "bool",
          required: false,
        },
        {
          name: "color",
          type: "text",
          required: true,
          min: 4,
          max: 9,
          pattern: "^#[0-9A-Fa-f]{6}$",
        },
        {
          name: "allowedUsers",
          type: "relation",
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 999,
          minSelect: 0,
        },
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
    });

    app.save(shiftTypes);

    const shifts = new Collection({
      name: "shifts",
      type: "base",
      fields: [
        {
          name: "user",
          type: "relation",
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
          minSelect: 1,
        },
        {
          name: "date",
          type: "date",
          required: true,
          max: "",
          min: "",
        },
        {
          name: "shiftType",
          type: "relation",
          required: true,
          collectionId: shiftTypes.id,
          cascadeDelete: false,
          maxSelect: 1,
          minSelect: 1,
        },
        {
          name: "startTime",
          type: "text",
          required: false,
          max: 10,
        },
        {
          name: "endTime",
          type: "text",
          required: false,
          max: 10,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_shifts_user_date ON shifts (user, date)",
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      deleteRule: 'user = @request.auth.id || @request.auth.role = "admin"',
    });

    app.save(shifts);

    const holidays = new Collection({
      name: "holidays",
      type: "base",
      fields: [
        {
          name: "date",
          type: "date",
          required: true,
        },
        {
          name: "name",
          type: "text",
          required: false,
          max: 200,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_holidays_date ON holidays (date)",
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
    });

    return app.save(holidays);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("holidays"));
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId("shifts"));
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId("shift_types"));
    } catch (_) {}

    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("firstName");
    users.fields.removeByName("lastName");
    users.fields.removeByName("role");
    users.listRule = null;
    users.viewRule = null;
    users.updateRule = null;
    users.deleteRule = null;
    app.save(users);
  }
);

/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const shifts = app.findCollectionByNameOrId("shifts");
    shifts.createRule = '@request.auth.id != ""';
    shifts.updateRule = '(@request.auth.role = "admin") || (user ?= @request.auth.id)';
    shifts.deleteRule = '(@request.auth.role = "admin") || (user ?= @request.auth.id)';
    return app.save(shifts);
  },
  (app) => {
    const shifts = app.findCollectionByNameOrId("shifts");
    shifts.createRule =
      '@request.auth.id != "" && (@request.auth.role = "admin" || @request.body.user:each ?= @request.auth.id || @request.body.user ?= @request.auth.id)';
    shifts.updateRule = '@request.auth.role = "admin" || user ?= @request.auth.id';
    shifts.deleteRule = '@request.auth.role = "admin" || user ?= @request.auth.id';
    return app.save(shifts);
  }
);

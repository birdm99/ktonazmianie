/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    // Puste createRule = publiczna rejestracja (w tym pierwsze logowanie OAuth2/OIDC).
    if (users.createRule === null) {
      users.createRule = "";
      app.save(users);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);
  }
);
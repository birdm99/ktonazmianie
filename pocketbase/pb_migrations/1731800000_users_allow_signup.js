/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    // Puste = rejestracja włączona (e-mail/hasło i pierwsze logowanie OAuth2/OIDC).
    // null / restrykcyjna reguła powoduje 400 „Failed to authenticate.” po udanym tokenie z IdP.
    users.createRule = "";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);
  }
);
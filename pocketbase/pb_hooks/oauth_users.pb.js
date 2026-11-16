/// <reference path="../pb_data/types.d.ts" />

// Każdy on* callback jest evalowany osobno — helpery muszą być WEWNĄTRZ tego callbacku.

onRecordAuthWithOAuth2Request((e) => {
  function oidcStr(v) {
    return typeof v === "string" ? v.trim() : "";
  }

  function oauth2UserFromEvent(ev) {
    return ev.oauth2User || ev.oAuth2User || null;
  }

  function oauthRawUser(oauth2User) {
    if (!oauth2User || typeof oauth2User !== "object") return {};
    const raw = oauth2User.rawUser || oauth2User.RawUser;
    if (raw && typeof raw === "object") return raw;
    return {};
  }

  function namesFromOidc(oauth2User) {
    const raw = oauthRawUser(oauth2User);
    let firstName = oidcStr(raw.given_name);
    let lastName = oidcStr(raw.family_name);

    if (!firstName && !lastName) {
      const full = oidcStr(raw.name) || oidcStr(oauth2User.name);
      if (full) {
        const parts = full.split(/\s+/).filter(Boolean);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      }
    }

    if (!firstName) {
      const email = oidcStr(oauth2User.email) || oidcStr(raw.email);
      const local = email.split("@")[0];
      firstName = local || oidcStr(raw.preferred_username) || "Użytkownik";
    }
    if (!lastName) lastName = "-";

    return { firstName: firstName, lastName: lastName };
  }

  function putCreateField(createData, key, value) {
    if (!createData || value === "" || value === null || value === undefined) return;
    const cur = createData[key];
    if (cur === undefined || cur === null || oidcStr(String(cur)) === "") {
      createData[key] = value;
    }
  }

  function oidcEmail(oauth2User) {
    const raw = oauthRawUser(oauth2User);
    return oidcStr(oauth2User.email) || oidcStr(raw.email);
  }

  function ensureOauth2Email(oauth2User) {
    if (!oauth2User) return;
    const raw = oauthRawUser(oauth2User);
    const email = oidcEmail(oauth2User);
    if (!email) return;
    try {
      oauth2User.email = email;
    } catch (_) {}
    if (raw.email_verified === false || raw.email_verified === "false") {
      $app.logger().warn("[oauth_users] Authentik email_verified=false — ustaw scope mapping email");
    }
  }

  function fillRecordOidcFields(record, oauth2User, createData) {
    const names = namesFromOidc(oauth2User);
    const email = oidcEmail(oauth2User);

    if (record) {
      if (!oidcStr(record.get("firstName"))) record.set("firstName", names.firstName);
      if (!oidcStr(record.get("lastName"))) record.set("lastName", names.lastName);
      if (!oidcStr(record.get("role"))) record.set("role", "employee");
      if (email && !oidcStr(record.email())) record.setEmail(email);
    }

    if (createData) {
      putCreateField(createData, "firstName", names.firstName);
      putCreateField(createData, "lastName", names.lastName);
      putCreateField(createData, "role", "employee");
      if (email) putCreateField(createData, "email", email);
    }
  }

  const oauth2User = oauth2UserFromEvent(e);
  $app.logger().info(
    "[oauth_users] auth-with-oauth2",
    "provider",
    e.providerName || "",
    "new",
    String(!e.record),
    "hasOAuth2User",
    String(!!oauth2User)
  );

  if (oauth2User) {
    const raw = oauthRawUser(oauth2User);
    $app.logger().info(
      "[oauth_users] userinfo",
      "sub",
      oidcStr(raw.sub),
      "email",
      oidcStr(raw.email),
      "verified",
      String(raw.email_verified)
    );

    ensureOauth2Email(oauth2User);
    if (e.record) fillRecordOidcFields(e.record, oauth2User, null);
    if (e.createData) {
      fillRecordOidcFields(null, oauth2User, e.createData);
      // PB 0.23+: verified w createData / setVerified w onRecordCreateRequest → validation_values_mismatch
      delete e.createData.verified;
      delete e.createData.email_verified;
    }

    if (!e.record) {
      const dataEmail = e.createData ? oidcStr(String(e.createData.email || "")) : "";
      const email = dataEmail || oidcEmail(oauth2User);
      if (!email) {
        throw new BadRequestError(
          "OIDC: brak email w userinfo Authentik (scope email + email_verified: True)."
        );
      }
      if (e.createData) {
        const fn = oidcStr(String(e.createData.firstName || ""));
        const ln = oidcStr(String(e.createData.lastName || ""));
        if (!fn || !ln) {
          throw new BadRequestError("OIDC: brak imienia/nazwiska w userinfo (scope profile).");
        }
      }
    }
  } else {
    throw new BadRequestError("OIDC: brak danych użytkownika z IdP (oauth2User puste).");
  }

  e.next();
}, "users");

onRecordCreateRequest((e) => {
  function oidcStr(v) {
    return typeof v === "string" ? v.trim() : "";
  }

  let info;
  try {
    info = e.requestInfo();
  } catch (_) {
    e.next();
    return;
  }

  if (!info || info.context !== "oauth2") {
    e.next();
    return;
  }

  const record = e.record;
  if (!oidcStr(record.get("role"))) record.set("role", "employee");
  if (!oidcStr(record.get("firstName"))) {
    const email = oidcStr(record.email());
    record.set("firstName", email.split("@")[0] || "Użytkownik");
  }
  if (!oidcStr(record.get("lastName"))) record.set("lastName", "-");
  // Nie ustawiaj verified tutaj (onRecordCreateRequest jest przed walidacją w PB ≥0.23).

  e.next();
}, "users");

console.log("[oauth_users] hooks registered");
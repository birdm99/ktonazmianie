/// <reference path="../pb_data/types.d.ts" />

function oidcStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function oauthRawUser(oauth2User) {
  if (!oauth2User || typeof oauth2User !== "object") return {};
  const raw = oauth2User.rawUser;
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

  return { firstName, lastName };
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

/** PB mapuje email z OIDC tylko gdy email_verified jest truthy — uzupełniamy ręcznie z userinfo. */
function ensureOauth2Email(oauth2User) {
  if (!oauth2User) return;
  const raw = oauthRawUser(oauth2User);
  const email = oidcEmail(oauth2User);
  if (!email) return;
  try {
    oauth2User.email = email;
  } catch (_) {
    /* ignore */
  }
  const verified = raw.email_verified;
  if (verified === false || verified === "false") {
    console.warn(
      "oauth_users: Authentik zwraca email_verified=false — rozważ własny scope mapping email w Authentik."
    );
  }
}

function fillRecordOidcFields(record, oauth2User, createData) {
  const { firstName, lastName } = namesFromOidc(oauth2User);
  const email = oidcEmail(oauth2User);

  if (record) {
    if (!oidcStr(record.get("firstName"))) record.set("firstName", firstName);
    if (!oidcStr(record.get("lastName"))) record.set("lastName", lastName);
    if (!oidcStr(record.get("role"))) record.set("role", "employee");
    if (email && !oidcStr(record.email())) record.setEmail(email);
  }

  if (createData) {
    putCreateField(createData, "firstName", firstName);
    putCreateField(createData, "lastName", lastName);
    putCreateField(createData, "role", "employee");
    if (email) putCreateField(createData, "email", email);
  }
}

onRecordAuthWithOAuth2Request((e) => {
  try {
    if (e.oauth2User) {
      const raw = oauthRawUser(e.oauth2User);
      console.log(
        "[oauth_users] auth",
        "sub=" + oidcStr(raw.sub),
        "email=" + oidcStr(raw.email),
        "verified=" + String(raw.email_verified),
        "new=" + String(!e.record)
      );
      ensureOauth2Email(e.oauth2User);
      if (e.record) {
        fillRecordOidcFields(e.record, e.oauth2User, null);
      }
      if (e.createData) {
        fillRecordOidcFields(null, e.oauth2User, e.createData);
      }

      if (!e.record && e.oauth2User) {
        const dataEmail = e.createData ? oidcStr(String(e.createData.email || "")) : "";
        const email = dataEmail || oidcEmail(e.oauth2User);
        if (!email) {
          throw new BadRequestError(
            "OIDC: brak email w odpowiedzi Authentik. W providerze PocketBase (oidc) scope: openid email profile; w Authentik własny scope mapping email z email_verified: True."
          );
        }
        if (e.createData) {
          const fn = oidcStr(String(e.createData.firstName || ""));
          const ln = oidcStr(String(e.createData.lastName || ""));
          if (!fn || !ln) {
            throw new BadRequestError(
              "OIDC: brak imienia/nazwiska w userinfo (given_name, family_name lub name w scope profile)."
            );
          }
        }
      }
    }
  } catch (err) {
    if (typeof BadRequestError !== "undefined" && err instanceof BadRequestError) {
      throw err;
    }
    console.error("oauth_users onRecordAuthWithOAuth2Request:", err);
  }
  e.next();
}, "users");

onRecordCreateRequest((e) => {
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
  if (oidcStr(record.email()) && !record.verified()) {
    record.setVerified(true);
  }

  e.next();
}, "users");

console.log("[oauth_users] hooks registered");
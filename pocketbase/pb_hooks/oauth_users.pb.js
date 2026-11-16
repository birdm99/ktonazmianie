/// <reference path="../pb_data/types.d.ts" />

function oidcStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function namesFromOidc(oauth2User) {
  const raw = oauth2User?.rawUser || {};
  let firstName = oidcStr(raw.given_name);
  let lastName = oidcStr(raw.family_name);

  if (!firstName && !lastName) {
    const full = oidcStr(raw.name) || oidcStr(oauth2User?.name);
    if (full) {
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }
  }

  if (!firstName) {
    const email = oidcStr(oauth2User?.email) || oidcStr(raw.email);
    const local = email.split("@")[0];
    firstName = local || oidcStr(raw.preferred_username) || "Użytkownik";
  }
  if (!lastName) lastName = "—";

  return { firstName, lastName };
}

function applyOidcUserFields(record, oauth2User, createData) {
  const { firstName, lastName } = namesFromOidc(oauth2User);
  const raw = oauth2User?.rawUser || {};
  const email = oidcStr(oauth2User?.email) || oidcStr(raw.email);

  const set = (key, value) => {
    if (!value) return;
    if (createData && !oidcStr(createData[key])) createData[key] = value;
    if (record && !oidcStr(record.get(key))) record.set(key, value);
  };

  set("firstName", firstName);
  set("lastName", lastName);
  set("role", "employee");

  if (email) {
    if (createData && !oidcStr(createData.email)) createData.email = email;
    if (record && !oidcStr(record.email())) record.setEmail(email);
  }
}

onRecordAuthWithOAuth2Request((e) => {
  if (!e.oauth2User) {
    e.next();
    return;
  }

  if (!e.createData) e.createData = {};

  if (e.record) {
    applyOidcUserFields(e.record, e.oauth2User, null);
  } else {
    applyOidcUserFields(null, e.oauth2User, e.createData);
  }

  e.next();
}, "users");

onRecordCreateRequest((e) => {
  const record = e.record;
  if (record.get("role") && record.get("firstName") && record.get("lastName")) {
    e.next();
    return;
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

  if (!record.get("role")) record.set("role", "employee");
  if (!record.get("firstName")) {
    const email = oidcStr(record.email());
    const local = email.split("@")[0];
    record.set("firstName", local || "Użytkownik");
  }
  if (!record.get("lastName")) record.set("lastName", "—");

  e.next();
}, "users");
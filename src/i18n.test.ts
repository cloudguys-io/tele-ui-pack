import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTIONARIES, dictionary, format } from "./i18n.ts";

test("every language has every key and no em or en dashes", () => {
  const keys = Object.keys(DICTIONARIES.en).sort();
  for (const [lang, d] of Object.entries(DICTIONARIES)) {
    assert.deepEqual(Object.keys(d).sort(), keys, lang);
    for (const [k, v] of Object.entries(d)) assert.ok(!/[–—]/.test(v), `${lang}.${k} has a dash`);
  }
});

test("lang lookup falls back by base tag, then to English", () => {
  assert.equal(dictionary("bn-BD").leave, DICTIONARIES.bn.leave);
  assert.equal(dictionary("xx").leave, "Leave");
  assert.equal(dictionary("bn", { exit: "Back" }).exit, "Back");
});

test("format fills placeholders and keeps unknown ones", () => {
  assert.equal(format("{count} in call {x}", { count: 3 }), "3 in call {x}");
});

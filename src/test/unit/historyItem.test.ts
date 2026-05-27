import { strict as assert } from "node:assert";
import { extractHistoryItemSha } from "../../commands/historyItem";

const FULL_SHA = "02920d872f11ed22afacf3966cb1da30b72dfe94";

describe("extractHistoryItemSha", () => {
  it("returns the value when arg is a non-empty string", () => {
    assert.equal(extractHistoryItemSha(FULL_SHA), FULL_SHA);
    assert.equal(extractHistoryItemSha("main"), "main");
  });

  it("returns undefined for an empty string", () => {
    assert.equal(extractHistoryItemSha(""), undefined);
  });

  it("returns undefined for null / undefined / numbers / booleans", () => {
    assert.equal(extractHistoryItemSha(null), undefined);
    assert.equal(extractHistoryItemSha(undefined), undefined);
    assert.equal(extractHistoryItemSha(42), undefined);
    assert.equal(extractHistoryItemSha(true), undefined);
  });

  it("extracts id directly from a SourceControlHistoryItem-shaped object", () => {
    assert.equal(extractHistoryItemSha({ id: FULL_SHA }), FULL_SHA);
    assert.equal(extractHistoryItemSha({ id: "main", message: "x" }), "main");
  });

  it("unwraps a { historyItem: { id } } shape", () => {
    assert.equal(extractHistoryItemSha({ historyItem: { id: FULL_SHA } }), FULL_SHA);
  });

  it("returns undefined when wrapper.historyItem is missing or not an object", () => {
    assert.equal(extractHistoryItemSha({ something: "else" }), undefined);
    assert.equal(extractHistoryItemSha({ historyItem: null }), undefined);
    assert.equal(extractHistoryItemSha({ historyItem: "not-an-object" }), undefined);
  });

  it("returns undefined when historyItem.id is empty / missing / wrong type", () => {
    assert.equal(extractHistoryItemSha({ id: "" }), undefined);
    assert.equal(extractHistoryItemSha({ id: 42 }), undefined);
    assert.equal(extractHistoryItemSha({ historyItem: {} }), undefined);
    assert.equal(extractHistoryItemSha({ historyItem: { id: "" } }), undefined);
    assert.equal(extractHistoryItemSha({ historyItem: { id: 0 } }), undefined);
  });
});

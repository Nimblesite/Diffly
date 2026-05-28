import { strict as assert } from "node:assert";
import * as vscode from "vscode";
import { readSeedShas, waitForRepoReady } from "./helpers";

const EXTENSION_ID = "nimblesite.diffy-scm";

const readDiffy = async (uriString: string): Promise<string> => {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uriString));
  return doc.getText();
};

describe("DiffyContentProvider (real diffy:// URIs against the seeded repo)", () => {
  before(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext !== undefined && !ext.isActive) {
      await ext.activate();
    }
    await waitForRepoReady();
  });

  it("resolves a.txt at every committed version with the expected content", async () => {
    const shas = readSeedShas();

    const a1 = await readDiffy(`diffy://commit/${shas.first}/a.txt`);
    assert.match(a1, /a\.txt v1/);
    assert.match(a1, /second line v1/);
    assert.doesNotMatch(a1, /third line/);

    const a2 = await readDiffy(`diffy://commit/${shas.second}/a.txt`);
    assert.match(a2, /a\.txt v2 edited/);
    assert.match(a2, /third line added/);
    assert.doesNotMatch(a2, /working copy uncommitted/);

    const a3 = await readDiffy(`diffy://commit/${shas.third}/a.txt`);
    assert.equal(a3, a2, "a.txt is unchanged from commit 2 to commit 3");
  });

  it("resolves dir/c.txt at v1 and v2 with the expected text", async () => {
    const shas = readSeedShas();
    const c1 = await readDiffy(`diffy://commit/${shas.first}/dir/c.txt`);
    assert.match(c1, /c\.txt v1/);
    const c2 = await readDiffy(`diffy://commit/${shas.second}/dir/c.txt`);
    assert.match(c2, /c\.txt v2 edited/);
    assert.notEqual(c1, c2);
  });

  it("returns the renamed file b2.txt at the third commit but not before", async () => {
    const shas = readSeedShas();
    const b2 = await readDiffy(`diffy://commit/${shas.third}/b2.txt`);
    assert.match(b2, /renamed and extended/);
    const missing = await readDiffy(`diffy://commit/${shas.first}/b2.txt`);
    assert.equal(missing, "", "b2.txt does not exist at commit 1 and should resolve to empty");
  });

  it("returns empty string for a deleted path (d.txt at commit 2)", async () => {
    const shas = readSeedShas();
    const deletedAtV2 = await readDiffy(`diffy://commit/${shas.second}/d.txt`);
    assert.equal(deletedAtV2, "");
    const aliveAtV1 = await readDiffy(`diffy://commit/${shas.first}/d.txt`);
    assert.match(aliveAtV1, /d\.txt v1/);
  });

  it("returns empty string for a malformed diffy URI", async () => {
    const bad = await readDiffy("diffy://nonsense/whatever");
    assert.equal(bad, "");
  });
});

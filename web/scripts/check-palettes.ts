import assert from "node:assert";
import { parsePalettes, fallbackPalettes, D } from "../lib/logic";
const ok = parsePalettes('```json\n{"palettes":[{"name":"a","colors":[{"hex":"#abc"},{"hex":"A1B2C3"},{"hex":"#112233"}]}]}\n```');
assert.deepEqual(ok[0].colors.map(c => c.hex), ["#aabbcc", "#A1B2C3", "#112233"]);
assert.equal(parsePalettes('{"palettes":[{"colors":[{"hex":"red"}]}]}').length, 0);
assert.equal(parsePalettes('{"palettes":[{"colors":[{"hex":"url(x)"}]}]}').length, 0);
assert.equal(parsePalettes("not json").length, 0);
for (const t of Object.keys(D.TYPES)) assert.equal(fallbackPalettes(t)[0].colors.length, 3);
console.log("palette check OK");

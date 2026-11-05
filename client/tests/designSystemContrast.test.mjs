import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/design-system/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...source.matchAll(/--va-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]));
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(text, background) {
  const first = luminance(tokens[text]), second = luminance(tokens[background]);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

for (const [text, background] of [
  ['text', 'ivory'], ['text', 'white'], ['text-secondary', 'ivory'], ['text-secondary', 'white'],
  ['white', 'teal-700'], ['white', 'teal-900'], ['white', 'pink-600'],
  ['text', 'gold-400'], ['text', 'gold-200'], ['teal-700', 'teal-100'],
  ['gold-text', 'gold-200'], ['pink-600', 'pink-100'], ['sidebar-text', 'teal-900'], ['sidebar-muted', 'teal-900'],
]) test(`${text} on ${background} meets 4.5:1 text contrast`, () => assert.ok(contrast(text, background) >= 4.5, `Measured ${contrast(text, background).toFixed(2)}:1`));

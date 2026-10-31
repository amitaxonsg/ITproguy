import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrowserNavigation } from './browser-runtime.mjs';
test('explicit navigation commands are parsed safely',()=>{assert.equal(parseBrowserNavigation('open chrome.com'),'https://chrome.com/');assert.equal(parseBrowserNavigation('Please go to https://example.org/docs'),'https://example.org/docs');assert.equal(parseBrowserNavigation('visit www.example.net'),'https://www.example.net/')});
test('ambiguous commands and unsafe schemes are not navigation commands',()=>{assert.equal(parseBrowserNavigation('open my local server'),null);assert.equal(parseBrowserNavigation('open javascript:alert(1)'),null);assert.equal(parseBrowserNavigation('click sign in'),null);assert.equal(parseBrowserNavigation(''),null)});

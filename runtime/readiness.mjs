import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import { config } from 'dotenv';
import { z } from 'zod';
config({ path: '/srv/itproguy/private/claude.env', quiet: true });
const settings = z.object({ ANTHROPIC_API_KEY: z.string().optional() }).parse(process.env);
if (typeof Anthropic !== 'function') throw new Error('Claude SDK import failed');
console.log('Claude SDK: installed; no API call made');
console.log('API key: '+(settings.ANTHROPIC_API_KEY ? 'configured (value hidden)' : 'not configured'));
const browser = await chromium.launch({ headless: true, chromiumSandbox: true, timeout: 30000 });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent('<title>ITProGuy readiness</title><h1>Browser ready</h1>');
  if (await page.title() !== 'ITProGuy readiness') throw new Error('Browser test failed');
  console.log('Chromium: sandbox enabled; isolated context and page verified');
  await context.close();
} finally { await browser.close(); }

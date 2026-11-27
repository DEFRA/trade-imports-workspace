import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { test } from '@fixtures';
import { SignInPage } from '@page-objects/shared/auth/sign-in-page';

const REVIEW_DIR = join(homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review');
const links: Record<string, string> = {
  ...JSON.parse(readFileSync(join(REVIEW_DIR, 'play-links-main.json'), 'utf8')),
  addressBook: 'http://localhost:3002/address-book',
  addressBookAdd: 'http://localhost:3002/address-book/add/address-type?start=true',
};

const signInIfAsked = async (page: Page): Promise<boolean> => {
  const signIn = new SignInPage(page);
  if (!(await signIn.inputUserId.isVisible())) {
    return false;
  }
  await signIn.signIn();
  await page.waitForLoadState('load');
  return true;
};

test('each link opens its page in a browser that signs in once per service', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const results = [];
  for (const [key, link] of Object.entries(links)) {
    await page.goto(link);
    const signedIn = await signInIfAsked(page);
    results.push({
      key,
      link,
      signedIn,
      landed: page.url(),
      h1: (await page.locator('h1').first().innerText()).trim(),
    });
  }
  writeFileSync(join(REVIEW_DIR, 'play-links-main-check.json'), `${JSON.stringify(results, null, 2)}\n`);
  await context.close();
});

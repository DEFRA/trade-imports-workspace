const fs = require('fs')
const path = require('path')
const { test, expect } = require('./support/fixtures')
const {
  url, urlFor, saveAndContinue, SPECIES, startNotification, answerOrigin, answerCommodity,
  answerReason, answerConsignmentDetails, answerArrival
} = require('./support/journey')

// EUDPA-691 tester observations, read against the Design Release 2.1 prototype:
// A. where "Save and continue" goes (opening run vs a page opened from the hub)
// B. what the hub says about Transit countries saved with none added.
// Screens go to snagging/eudpa-691/screens/.

const SCREENS = path.join(__dirname, '..', '..', 'snagging', 'eudpa-691', 'screens')

async function shoot (page, name) {
  await page.waitForLoadState('load')
  await page.waitForTimeout(300)
  fs.mkdirSync(SCREENS, { recursive: true })
  await page.screenshot({ path: path.join(SCREENS, `${name}.png`), fullPage: true })
}

async function toTransitByRoad (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.chicken)
  await answerReason(page)
  await answerConsignmentDetails(page, { [SPECIES.chicken.id]: 100 })
  await page.goto(url('/arrival-details'))
  await answerArrival(page, { means: 'Road', port: { search: 'Dover', option: 'Dover' }, transportId: 'AB12 CDE' })
  await expect(page).toHaveURL(urlFor('/transit-countries'))
}

const transitRow = (page) =>
  page.locator('.app-notification-hub-tasklist__link', { hasText: 'Transit countries' })
    .locator('xpath=ancestor::li[1]')

test('A1 opening run: Back from main import reason goes to the previous page, and the run carries on', async ({ page }) => {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.cattle)
  await expect(page).toHaveURL(urlFor('/reason-for-import'))
  await expect(page.locator('.govuk-back-link')).toHaveAttribute('href', /what-are-you-importing/)
  await shoot(page, 'a1-reason-in-run-back-link')
  await page.locator('.govuk-back-link').click()
  await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
  await saveAndContinue(page)
  await expect(page).toHaveURL(urlFor('/reason-for-import'))
  await shoot(page, 'a1-after-back-save-continues-to-reason')
})

test('A2 opened from the hub: Arrival details returns to the hub on Save and continue', async ({ page }) => {
  await toTransitByRoad(page)
  await page.goto(url('/notification-hub'))
  await page.locator('.app-notification-hub-tasklist__link', { hasText: 'Arrival details' }).click()
  await expect(page).toHaveURL(/arrival-details\?from=hub/)
  await shoot(page, 'a2-arrival-opened-from-hub')
  await saveAndContinue(page)
  await expect(page).toHaveURL(urlFor('/notification-hub'))
  await shoot(page, 'a2-arrival-from-hub-returns-to-hub')
})

test('B1 opening run: Transit countries with none added continues to the transporter, and the hub reads To do', async ({ page }) => {
  await toTransitByRoad(page)
  await shoot(page, 'b1-transit-countries-none-added')
  await saveAndContinue(page)
  await expect(page).toHaveURL(urlFor('/transporter'))
  await shoot(page, 'b1-run-continues-to-transporter')
  await page.goto(url('/notification-hub'))
  await expect(transitRow(page)).toContainText('To do')
  await shoot(page, 'b1-hub-transit-countries-to-do')
})

test('B2 opened from the hub: Transit countries saved with none returns to the hub, still To do', async ({ page }) => {
  await toTransitByRoad(page)
  await page.goto(url('/notification-hub'))
  await transitRow(page).locator('a').click()
  await expect(page).toHaveURL(/transit-countries\?from=hub/)
  await saveAndContinue(page)
  await expect(page).toHaveURL(urlFor('/notification-hub'))
  await expect(transitRow(page)).toContainText('To do')
  await shoot(page, 'b2-hub-after-saving-none-from-hub')
})

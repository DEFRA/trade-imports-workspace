export const SET_UP_FIRST_LINE = 3

/**
 * A Vitest file whose 13-line journey set-up starts at SET_UP_FIRST_LINE.
 * Two files made with different parameter names hold the same set-up block.
 */
export const testFileWithSetUp = (parameter, title) =>
  [
    "import { test, expect } from 'vitest'",
    '',
    `const seedJourney = async (store, ${parameter}) => {`,
    "  const journey = await store.create({ owner: 'user-1' })",
    "  await store.answer(journey.id, 'origin', { country: 'FR' })",
    "  await store.answer(journey.id, 'destination', { country: 'GB' })",
    "  await store.answer(journey.id, 'transport', { mode: 'road' })",
    "  await store.answer(journey.id, 'commodity', { code: '0101' })",
    "  await store.answer(journey.id, 'quantity', { count: 12 })",
    "  await store.answer(journey.id, 'purpose', { reason: 'sale' })",
    '  await store.submit(journey.id)',
    '  const submitted = await store.read(journey.id)',
    "  expect(submitted.status).toBe('SUBMITTED')",
    '  return submitted',
    '}',
    '',
    `test('${title}', () => expect(1).toBe(1))`,
    ''
  ].join('\n')

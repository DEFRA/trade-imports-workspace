## Summary
- Extend `AnimalsJourney` to submit Cow + Cat (commodity details + identification).
- Add `persistence-multi-commodity.spec.ts` asserting Mongo `commodities[]` with two entries after submit.
- Update `persistence-notification.spec.ts` and `NotificationDocument` types for `commodities[]` instead of legacy `commodity`.
- `aggregated-notification.spec.ts` intentionally expects `draftDoc.commodity` to be `"Live bovine animals"` (GBN-AG line description), not `"Cow"`.

## Test plan
- [ ] Animals frontend/backend PR stack with `fix/EUDPA-669-commodity-name-code-type` images
- [ ] `npm run test:docker-compose -- tests/animals/e2e/journeys/persistence/persistence-multi-commodity.spec.ts`
- [ ] `npm run test:docker-compose -- tests/animals/e2e/journeys/persistence/persistence-notification.spec.ts`
- [ ] `npm run test:docker-compose -- tests/animals/e2e/journeys/persistence/api-seed-parity.spec.ts` (cow-and-cat seed parity)

Pairs with DEFRA/trade-imports-animals-frontend#432 and DEFRA/trade-imports-animals-backend#115 (same branch name).

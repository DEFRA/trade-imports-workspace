## End-to-end and feature test specifics

- Locators by role, label or test id, not by CSS structure or text that
  copy changes would break.
- Web-first assertions (`await expect(locator)…`) that wait, never a fixed
  `waitForTimeout`.
- A page sequence used by two specs belongs in the journey helper or a
  page object.
- Tags (`@smoke`, service tags) match what the spec exercises.
- Page objects and helpers are reviewed as shared support: a name, comment
  or copied body there follows the same rules as in source code.

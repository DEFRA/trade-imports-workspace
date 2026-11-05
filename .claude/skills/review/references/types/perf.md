## Reviewing performance tests

You may read only this brief.

- Every scenario has thresholds that fail the run, not only checks that
  report.
- `check` calls assert the response the scenario depends on, not just a
  status code.
- Load shapes, SLAs and targets come from the suite's config modules, not
  literals in a scenario.
- Test data does not collide between virtual users.
- The naming, comments and structure rules in the house rules apply to
  the k6 modules and their helpers.

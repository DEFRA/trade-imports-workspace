## Reviewing skills and documentation

You may read only this brief. Whether the change makes a statement in
another file untrue is the consistency reviewer's check.

- **Skills** (`.claude/skills/**`): check each changed skill file against
  the skill patterns and anti-patterns in your guides. Triggers and NOT-for
  lines are specific; steps name the scripts they run; paths use the
  canonical `~/git/defra/trade-imports-workspace/` form; nothing is
  promised that no script or step does. A step marked unproven stays
  marked until a run confirms it.
- **Templates and assets** in a skill (JSON, markdown templates): every
  placeholder is filled by a named step, and the shape matches what the
  scripts read.
- **Documentation:** plain English, active voice, short sentences.
  Commands and paths are correct for this workspace. A doc states how
  things are now, with no history.
- **Accuracy:** a statement about a script, flag or file in the diff that
  the diff contradicts is a `comments` finding.

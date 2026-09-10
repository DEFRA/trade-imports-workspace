Increment **inc-123** — ticket **EUDPA-551**.

> Frontend asks which type of transporter is moving the animals before showing any list; Design release 1 shows one searchable list of all approved transporters, commercial and private together, and asks the type only when a user adds a new one.

## The problem

The transport section asked "What type of transporter will move the animals?" first, and forked the journey off the answer: commercial went to a list to pick from, private went to a blank name-and-address form. The two branches never met, so a trader whose transporter was already known to the service but private had no list to pick it from and retyped the whole address.

## What changed

The order of the task is reversed to match design release 1.

- The transport section now holds one transporter step: the list. Adding a transporter that is not on it is a detour off that page rather than a leg of the journey, so the type chooser and the two forms it leads to come off the linear flow.
- `/transporters` is the list page. It shows every transporter the trader can use — commercial and private together, one row per record with its type — under the DAERA and APHA guidance and the "person or company responsible for transporting the consignment" introduction, with a radio to pick one.
- The commercial-or-private question moves behind an **Add a transporter** route beneath the table, as the first step of adding a record that is not listed. Its two branches are now the two ways of *adding* a transporter, not of *choosing* one.
- The local fixture is widened to carry private transporters alongside commercial ones. The `commercial-transporters` service is renamed to `transporters`, and a `transporter-record` module is split out for the shared record shape.

## Out of scope

The wording on the chooser and on the private-transporter form it leads to also differs from design release 1. That is **inc-124** and lands separately.

## Repos

Frontend only. The tests repo was branched for this increment but needed no changes, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ

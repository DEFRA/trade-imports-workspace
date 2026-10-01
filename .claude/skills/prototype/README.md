# Prototyping with Claude Code

Change the high-risk plants prototype by saying what you want, in your own
words. Claude Code does the work and checks it. You get pictures to look at
and links to share.

The prototype is a copy of the real plants service, so every page you do not
change already works like the real thing.

## See it first

You do not need to install anything to look:

- [Demo videos](https://defra.github.io/trade-imports-plants-prototype/): the
  most important journeys, most important first
- [Service map](https://defra.github.io/trade-imports-plants-prototype/service-map/):
  every page, and how the pages connect

## Set up (once)

You need:

- a GitHub account in the DEFRA organisation, with write access to the
  prototype (ask the prototype maintainer)
- the workspace cloned to `~/git/defra/trade-imports-workspace`
- Node.js 24
- [Claude Code](https://claude.com/claude-code)

Then run these 2 commands:

```
npm --prefix ~/git/defra/trade-imports-workspace/tim link
tim prototype setup
```

The second command tells you if anything is still missing, and how to fix it.

[Your first hour](https://github.com/DEFRA/trade-imports-plants-prototype/blob/main/docs/designers/your-first-hour.md)
has every step in detail.

## Each time

1. Open Claude Code in `~/git/defra/trade-imports-workspace`, not in the
   prototype's own folder.
2. Say **"run the prototype"**.
3. Open [http://localhost:3103](http://localhost:3103).

## What you can ask for

You never need to know command or skill names. Say what you want, for
example:

| You want to | Say something like |
| --- | --- |
| Get started | "I'm new, what can I do here?" |
| Make your own copy to change | "Start a new design release" |
| Change wording | "Change the hint on the arrival page to…" |
| Change a page's layout | "Make this page match this Figma frame" |
| Add or move a question or page | "Add a question asking if the plants were grown under glass" |
| Add a feature the real service does not have | "Let them pick a saved transporter" |
| Fill the dashboard with examples | "Show a late notification on the dashboard" |
| See your change | "Show me, before and after" |
| Check nothing is broken | "Check my changes" |
| See how the pages connect | "Show me the service map" |
| Get ready for user research | "Get ready for research next week" |
| Work through feedback | "Here are my notes from the crit" |
| Save and share | "Save my work" then "share this" |
| Hand it to the developers | "Write this up as a story for the developers" |

If Claude seems lost, say **"use the prototype skill"**.

## Sharing your work

- **Straight to main:** say "share this". The deployed prototype and the
  [demo videos](https://defra.github.io/trade-imports-plants-prototype/) update
  after the checks run.
- **Not ready yet:** say "keep this off main". Claude makes a draft pull
  request with its own demo link, so others can see work in progress.

You choose. You never have to use branches.

## Good to know

- You never change the real journey. Your changes go into your own copy,
  called a design release.
- English and Welsh change together. Missing Welsh is marked
  `[Welsh needed]`.
- The prototype uses made-up data. Nothing you do reaches the real service.
- Claude follows the real service's code conventions for you, so a hand-off
  is close to something the developers can use.
- The deployed prototype can be password-protected. Ask the prototype
  maintainer for the password.
- The header's "Address book" link goes nowhere on purpose. The address book
  belongs to a different service.

## More help

- [Your first hour](https://github.com/DEFRA/trade-imports-plants-prototype/blob/main/docs/designers/your-first-hour.md):
  setting up, step by step
- [Designer guides](https://github.com/DEFRA/trade-imports-plants-prototype/tree/main/docs/designers):
  releases, wording, checks, sharing and more
- [Glossary](https://github.com/DEFRA/trade-imports-plants-prototype/blob/main/docs/designers/glossary.md):
  every term these guides use

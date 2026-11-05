## Reviewing templates, styles and client-side code

You may read only this brief. Whether a controller supplies the data a
template uses, and whether client code and styles are registered in the
build, are the consistency reviewer's checks.

- **Stay in the GOV.UK toolbox:** govuk-frontend Nunjucks macros and
  `govuk-*` classes, not hand-written HTML for a component the design
  system has, and not custom CSS where a `govuk-*` class does the job.
- **Accessibility:** every input has a label; errors use the error summary
  and the field error message; headings go in order; link text makes sense
  on its own; no meaning carried by colour alone.
- **Content style:** plain English, sentence case, and hint text that says
  how to answer, not what the question means. Copy wording itself goes to
  the business analysts' review, not to you: raise only a breach of a
  guide rule.
- **Design source:** copy, layout or a component that differs from the
  ticket's design source is `correctness`. Where a guide disagrees with
  the design source, or the source does not show the case, it is `design`
  (see the core instructions).
- **Client-side JavaScript:** progressive enhancement, so the page works
  without it. The naming and comments rules in the house rules apply.
- Every comment in a template follows the house rules on comments.

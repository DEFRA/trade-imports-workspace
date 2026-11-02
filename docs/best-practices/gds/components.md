# GDS Components

Based on [GOV.UK Design System](https://design-system.service.gov.uk/components/).

## Navigation
| Component | Description |
|-----------|-------------|
| Back link | Return to previous page |
| Breadcrumbs | Hierarchical navigation |
| Pagination | Navigate between pages |
| Service navigation | Primary menu |
| Skip link | Skip to main content |
| Exit this page | Emergency exit |

## Form Inputs
| Component | Description |
|-----------|-------------|
| Button | Clickable action |
| Checkboxes | Multiple selection |
| Date input | Date entry |
| File upload | Document submission |
| Password input | Secure entry with show/hide |
| Radios | Single selection |
| Select | Dropdown |
| Text input | Single-line text |
| Textarea | Multi-line text |
| Character count | Text with limit tracking |

## Form Structure
| Component | Description |
|-----------|-------------|
| Fieldset | Group related fields |
| Error message | Field validation feedback |
| Error summary | All errors at page top |

## Content Display
| Component | Description |
|-----------|-------------|
| Accordion | Expandable sections |
| Details | Show/hide content |
| Inset text | Important information box |
| Panel | Confirmation container |
| Summary list | Key-value display |
| Table | Data rows/columns |
| Tabs | Tabbed content |
| Tag | Category label |
| Warning text | Alert message |

## Page Structure
| Component | Description |
|-----------|-------------|
| GOV.UK header | Crown branding |
| GOV.UK footer | Standard links |
| Phase banner | Alpha/beta/live |
| Cookie banner | Consent notification |
| Notification banner | Announcements |

## Progress
| Component | Description |
|-----------|-------------|
| Task list | Progress checklist |

## Usage Guidelines

- Always use GOV.UK components as starting point
- Tested with users, meet accessibility standards
- Adapt only when research shows need
- Contribute improvements back

## Stay in the GOV.UK toolbox

If it is not in GOV.UK Frontend, do not build it. Custom CSS forks the design system and loses its accessibility testing and its consistency with other services.

**Layout and look.** Use `govuk-*` components and utility classes: spacing, typography, the grid, `govuk-inset-text`, `govuk-summary-list`, `govuk-summary-card`, `govukDetails`, `govukFieldset`. Do not add a SCSS partial or a CSS rule.

- Bad: a new SCSS partial that wraps each form section in a bordered card.
- Good: a heading for each section and `govuk-!-margin-bottom-*` utilities between them.

If a layout seems to need custom CSS, find the component or utility that does the job and propose that. If nothing in the toolbox does it, state the trade-off and ask before adding CSS.

**JavaScript.** Every page works fully without JavaScript. CSS and JavaScript only enhance it. Never copy a prototype's JavaScript behaviour as it is. Before building, triage each behaviour in this order:

1. Does GOV.UK Frontend do it? Use that.
2. If not, does a tested, accessible component from another government design system do it (MoJ, HMRC, Scottish Government)? Use that.
3. If not, why must the service have it? If nothing compels it, go back to design and say it is not needed.

**A plants-prototype design release.** Alpha research is where a pattern's
evidence is gathered, so a designer may reach step 3 in their own design
release. Their answer to "why must the service have it?" is recorded in the
release's `patterns.md`, and the pattern lives only in that release's
`assets/`. It reaches a real service as a pattern request with that
evidence, never as copied code. Every real service repo follows this
section as written.

The alphagov `accessible-autocomplete`, enhancing a native `<select>`, is an accepted component: with JavaScript off, the user gets the select.

- Bad: a drop zone that only uploads with JavaScript, copied from the prototype.
- Good: a `govukFileUpload` in a form that posts without JavaScript, enhanced by the drop zone when JavaScript runs.

## Examples

### Button
```html
<button class="govuk-button" data-module="govuk-button">
  Save and continue
</button>
```

### Text Input
```html
<div class="govuk-form-group">
  <label class="govuk-label" for="event-name">Event name</label>
  <input class="govuk-input" id="event-name" name="eventName" type="text">
</div>
```

### Error Message
```html
<div class="govuk-form-group govuk-form-group--error">
  <label class="govuk-label" for="event-name">Event name</label>
  <p class="govuk-error-message">
    <span class="govuk-visually-hidden">Error:</span> Enter an event name
  </p>
  <input class="govuk-input govuk-input--error" id="event-name" name="eventName" type="text">
</div>
```

## Accessibility

All components:
- Work with assistive technologies
- Meet WCAG 2.2 AA
- Support keyboard navigation
- Provide ARIA attributes

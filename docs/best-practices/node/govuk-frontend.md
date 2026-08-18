# GOV.UK Frontend — Best Practices

Project baseline: `govuk-frontend ^6.1.0`, Nunjucks templating, Hapi.js + Vision. Used in `trade-imports-animals-frontend` and `trade-imports-animals-admin`.

---

## 1. Project setup

**Package version:** `govuk-frontend ^6.1.0`

**JavaScript initialisation** (in `public/application.js` or equivalent):

```js
import {
    createAll,
    Button,
    Checkboxes,
    ErrorSummary,
    Radios,
    SkipLink
} from 'docs/best-practices/node/govuk-frontend'

// Initialise all required components
createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)  // auto-focuses on page load when present
createAll(Radios)
createAll(SkipLink)
```

**Nunjucks template search path** must include `node_modules/govuk-frontend/dist/` first:

```js
nunjucks.configure([
  'node_modules/govuk-frontend/dist/',    // GOV.UK templates
  'src/server/common/templates',          // project layouts
  'src/server/common/components'          // project components
], { autoescape: true, trimBlocks: true, lstripBlocks: true })
```

**Global context** (available in every template):

| Variable | Type | Purpose |
|---------|------|---------|
| `serviceName` | string | Service name for header/title |
| `userSession` | object | Authenticated user's session |
| `navigation` | array | Nav items (active state, href, text) |
| `breadcrumbs` | array | Breadcrumb trail |
| `getAssetPath` | function | Returns `/public/{file}` |
| `authEnabled` | boolean | Whether auth is active |
| `csrfToken` | string | CSRF token for forms |

---

## 2. Template inheritance — three-level chain

```
govuk/template.njk          ← GOV.UK HTML skeleton
  └── layouts/page.njk      ← project layout (header, footer, nav)
        └── {feature}.njk   ← page-specific content
```

`layouts/page.njk`:

```nunjucks
{% extends "govuk/template.njk" %}

{% block pageTitle %}{{ pageTitle }} — {{ serviceName }}{% endblock %}

{% block head %}
  <link rel="stylesheet" href="{{ getAssetPath('application.css') }}">
{% endblock %}

{% block header %}
  {% from "common/components/service-header/macro.njk" import appServiceHeader %}
  {{ appServiceHeader({ serviceName: serviceName, navigation: navigation }) }}
{% endblock %}

{% block content %}
  <div class="govuk-width-container">
    {% from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner %}
    {{ govukPhaseBanner({
      tag: { text: "Beta" },
      html: 'This is a new service — <a class="govuk-link" href="/feedback">give us your feedback</a>.'
    }) }}

    <main class="govuk-main-wrapper" id="main-content" role="main">
      {% block mainContent %}{% endblock %}
    </main>
  </div>
{% endblock %}

{% block footer %}
  {% from "govuk/components/footer/macro.njk" import govukFooter %}
  {{ govukFooter({}) }}
{% endblock %}

{% block bodyEnd %}
  <script src="{{ getAssetPath('application.js') }}" type="module"></script>
{% endblock %}
```

Page template:

```nunjucks
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% extends "layouts/page.njk" %}

{% set pageTitle = "Reference number" %}

{% block mainContent %}
  {% if errorList %}
    {{ govukErrorSummary({ titleText: "There is a problem", errorList: errorList }) }}
  {% endif %}

  <form method="POST" action="/reference">
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">
    {{ govukInput({ ... }) }}
    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

Available blocks from `govuk/template.njk`:

| Block | Purpose |
|-------|---------|
| `pageTitle` | `<title>` |
| `head` | Additional `<head>` content |
| `bodyStart` | Before skip link (cookie banners) |
| `skipLink` | Skip to main content link |
| `header` | Page header |
| `main` / `content` | Main content wrapper |
| `footer` | Page footer |
| `bodyEnd` | Before `</body>` (scripts) |

---

## 3. Macro import syntax

**Always import at the top of the file, before `{% extends %}`:**

```nunjucks
{# Correct — imports at top #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}
```

Import multiple from one file is not supported — one `{% from %}` per component.

---

## 4. Component reference

### Text input

```nunjucks
{% from "govuk/components/input/macro.njk" import govukInput %}

{{ govukInput({
  id: "referenceNumber",
  name: "referenceNumber",
  value: referenceNumber,
  label: {
    text: "Reference number",
    classes: "govuk-label--l",
    isPageHeading: true
  },
  hint: { text: "For example, DRAFT.IMP.2026.123" },
  errorMessage: errors.referenceNumber and { text: errors.referenceNumber },
  autocomplete: "off",
  classes: "govuk-input--width-20",
  type: "text",
  spellcheck: false,
  inputmode: "text"
}) }}
```

### Radios

```nunjucks
{% from "govuk/components/radios/macro.njk" import govukRadios %}

{{ govukRadios({
  idPrefix: "requiresRegionCode",
  name: "requiresRegionCode",
  value: requiresRegionCode,
  fieldset: {
    legend: {
      text: "Does the origin have a region code?",
      isPageHeading: true,
      classes: "govuk-fieldset__legend--l"
    }
  },
  hint: { text: "Select one option" },
  errorMessage: errors.requiresRegionCode and { text: errors.requiresRegionCode },
  items: [
    { value: "yes", text: "Yes" },
    { value: "no", text: "No" },
    { value: "unsure", text: "I'm not sure",
      hint: { text: "You can find this on the import certificate" } }
  ]
}) }}
```

### Checkboxes

```nunjucks
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}

{{ govukCheckboxes({
  idPrefix: "certifications",
  name: "certifications",
  fieldset: {
    legend: { text: "Which certifications apply?", classes: "govuk-fieldset__legend--m" }
  },
  hint: { text: "Select all that apply" },
  errorMessage: errors.certifications and { text: errors.certifications },
  items: [
    {
      value: "health",
      text: "Health certificate",
      checked: "health" in (certifications if certifications else [])
    },
    {
      value: "origin",
      text: "Certificate of origin",
      checked: "origin" in (certifications if certifications else []),
      conditional: { html: "<p>Upload the certificate below</p>" }
    }
  ]
}) }}
```

### Select

```nunjucks
{% from "govuk/components/select/macro.njk" import govukSelect %}

{{ govukSelect({
  id: "countryCode",
  name: "countryCode",
  label: { text: "Country of origin", classes: "govuk-label--m" },
  hint: { text: "Select the country the goods are coming from" },
  errorMessage: errors.countryCode and { text: errors.countryCode },
  value: countryCode,
  items: [{ value: "", text: "Select a country" }] + countryOptions
}) }}
```

### Button

```nunjucks
{% from "govuk/components/button/macro.njk" import govukButton %}

{{ govukButton({ text: "Continue" }) }}
{{ govukButton({ text: "Save as draft", classes: "govuk-button--secondary" }) }}
{{ govukButton({ text: "Delete", classes: "govuk-button--warning", preventDoubleClick: true }) }}
{{ govukButton({ text: "Start now", href: "/start", isStartButton: true }) }}
```

### Error summary — place before form, after h1

```nunjucks
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% if errorList %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errorList,
    disableAutoFocus: false
  }) }}
{% endif %}
```

`errorList` items must link to field IDs:
```js
// In controller
const errorList = Object.entries(errors).map(([field, message]) => ({
  text: message,
  href: `#${field}`   // must match the id in the corresponding govuk macro
}))
```

### Notification banner

```nunjucks
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}

{# Success #}
{{ govukNotificationBanner({
  type: "success",
  titleText: "Success",
  html: "<h3 class=\"govuk-notification-banner__heading\">Notification submitted</h3>
         <p class=\"govuk-body\">Your reference number is <strong>DRAFT.IMP.2026.1</strong></p>"
}) }}

{# Important information #}
{{ govukNotificationBanner({
  titleText: "Important",
  text: "The service will be unavailable on Saturday from 8am to 10am."
}) }}
```

### Summary list

```nunjucks
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}

{{ govukSummaryList({
  rows: [
    {
      key: { text: "Country of origin" },
      value: { text: countryName },
      actions: {
        items: [{
          href: "/origin?returnTo=check-answers",
          text: "Change",
          visuallyHiddenText: "country of origin"
        }]
      }
    },
    {
      key: { text: "Commodity type" },
      value: { html: "<ul class=\"govuk-list\"><li>Live cattle</li><li>Live sheep</li></ul>" }
    }
  ]
}) }}
```

### Table

```nunjucks
{% from "govuk/components/table/macro.njk" import govukTable %}

{{ govukTable({
  caption: "Import notifications",
  captionClasses: "govuk-table__caption--m",
  firstCellIsHeader: true,
  head: [
    { text: "Reference" },
    { text: "Status" },
    { text: "Created", format: "numeric" }
  ],
  rows: notifications | map(n => [
    { html: "<a href=\"/notifications/" + n.referenceNumber + "\">" + n.referenceNumber + "</a>" },
    { text: n.status },
    { text: n.createdAt | formatDate("d MMM yyyy"), format: "numeric" }
  ])
}) }}
```

### Pagination

```nunjucks
{% from "govuk/components/pagination/macro.njk" import govukPagination %}

{{ govukPagination({
  previous: { href: "/notifications?page=" + (currentPage - 1) } if currentPage > 1,
  next: { href: "/notifications?page=" + (currentPage + 1) } if hasNextPage,
  items: paginationItems
}) }}
```

### Breadcrumbs

```nunjucks
{% from "govuk/components/breadcrumbs/macro.njk" import govukBreadcrumbs %}

{{ govukBreadcrumbs({
  items: [
    { text: "Home", href: "/" },
    { text: "Notifications", href: "/notifications" },
    { text: "New notification" }
  ],
  collapseOnMobile: true
}) }}
```

### Back link

```nunjucks
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}
{{ govukBackLink({ text: "Back", href: backLink }) }}
```

### Tag

```nunjucks
{% from "govuk/components/tag/macro.njk" import govukTag %}

{{ govukTag({ text: "Draft", classes: "govuk-tag--grey" }) }}
{{ govukTag({ text: "Approved", classes: "govuk-tag--green" }) }}
{{ govukTag({ text: "Rejected", classes: "govuk-tag--red" }) }}
```

Tag colour modifiers: `govuk-tag--grey`, `govuk-tag--green`, `govuk-tag--turquoise`, `govuk-tag--blue`, `govuk-tag--purple`, `govuk-tag--pink`, `govuk-tag--red`, `govuk-tag--orange`, `govuk-tag--yellow`

### Details (expandable)

```nunjucks
{% from "govuk/components/details/macro.njk" import govukDetails %}

{{ govukDetails({
  summaryText: "Help with region codes",
  text: "A region code is a two-letter code identifying the region within the country of origin."
}) }}
```

### Inset text

```nunjucks
{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}

{{ govukInsetText({
  text: "You can only import goods from approved countries."
}) }}
```

### Warning text

```nunjucks
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}

{{ govukWarningText({
  text: "You can be fined up to £5,000 if you provide false information.",
  iconFallbackText: "Warning"
}) }}
```

### Panel (confirmation)

```nunjucks
{% from "govuk/components/panel/macro.njk" import govukPanel %}

{{ govukPanel({
  titleText: "Application submitted",
  html: "Your reference number<br><strong>DRAFT.IMP.2026.123</strong>"
}) }}
```

### Date input

```nunjucks
{% from "govuk/components/date-input/macro.njk" import govukDateInput %}

{{ govukDateInput({
  id: "arrivalDate",
  namePrefix: "arrivalDate",
  fieldset: {
    legend: {
      text: "What is the expected arrival date?",
      isPageHeading: true,
      classes: "govuk-fieldset__legend--l"
    }
  },
  hint: { text: "For example, 27 3 2026" },
  errorMessage: errors.arrivalDate and { text: errors.arrivalDate },
  items: [
    { name: "day",   label: { text: "Day" },   classes: "govuk-input--width-2", value: arrivalDate.day },
    { name: "month", label: { text: "Month" }, classes: "govuk-input--width-2", value: arrivalDate.month },
    { name: "year",  label: { text: "Year" },  classes: "govuk-input--width-4", value: arrivalDate.year }
  ]
}) }}
```

---

## 5. Form patterns

### Complete form with error handling

```nunjucks
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}

{% set pageTitle = "Where are the goods coming from?" %}

{% block mainContent %}
  {# Error summary — always before the form, always present in DOM when errors exist #}
  {% if errorList %}
    {{ govukErrorSummary({
      titleText: "There is a problem",
      errorList: errorList
    }) }}
  {% endif %}

  <form method="POST" action="/origin" novalidate>
    {# CSRF token — always include #}
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">

    {{ govukSelect({
      id: "countryCode",
      name: "countryCode",
      label: { text: "Country of origin", classes: "govuk-label--m" },
      hint: { text: "Select the country the goods are coming from" },
      errorMessage: errors.countryCode and { text: errors.countryCode },
      value: countryCode,
      items: [{ value: "", text: "Select a country" }] + countryOptions
    }) }}

    {{ govukRadios({
      idPrefix: "requiresRegionCode",
      name: "requiresRegionCode",
      value: requiresRegionCode,
      fieldset: {
        legend: { text: "Does the origin have a region code?", classes: "govuk-fieldset__legend--m" }
      },
      errorMessage: errors.requiresRegionCode and { text: errors.requiresRegionCode },
      items: [
        { value: "yes", text: "Yes" },
        { value: "no", text: "No" }
      ]
    }) }}

    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

### Controller — build errorList for error summary

```js
// controller.js
const { error, value } = originSchema.validate(request.payload, { abortEarly: false })

if (error) {
  const errors = Object.fromEntries(
    error.details.map(d => [d.context.key, d.message])
  )
  const errorList = Object.entries(errors).map(([field, message]) => ({
    text: message,
    href: `#${field}`   // must match the `id` in the govuk macro
  }))
  return h.view('origin/origin', {
    ...request.payload,  // re-populate form with submitted values
    errors,
    errorList
  })
}

// Valid — POST-Redirect-GET
await notificationClient.save(request, value)
return h.redirect('/commodities')
```

---

## 6. Page layout patterns

### Question page (one question per page — GDS pattern)

```nunjucks
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}

{% extends "layouts/page.njk" %}
{% set pageTitle = "Does the consignment require a health certificate?" %}

{% block mainContent %}
  {{ govukBackLink({ text: "Back", href: "/origin" }) }}

  <form method="POST" novalidate>
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">

    {# Single question — fieldset legend IS the page heading #}
    {{ govukRadios({
      idPrefix: "requiresHealthCertificate",
      name: "requiresHealthCertificate",
      value: requiresHealthCertificate,
      fieldset: {
        legend: {
          text: pageTitle,
          isPageHeading: true,
          classes: "govuk-fieldset__legend--l"
        }
      },
      errorMessage: errors.requiresHealthCertificate and { text: errors.requiresHealthCertificate },
      items: [{ value: "yes", text: "Yes" }, { value: "no", text: "No" }]
    }) }}

    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

### Check your answers

```nunjucks
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}
{% set pageTitle = "Check your answers before submitting" %}

{% block mainContent %}
  <h1 class="govuk-heading-l">{{ pageTitle }}</h1>

  {{ govukSummaryList({
    rows: [
      {
        key: { text: "Country of origin" },
        value: { text: countryName },
        actions: { items: [{ href: "/origin?returnTo=check-answers", text: "Change", visuallyHiddenText: "country of origin" }] }
      },
      {
        key: { text: "Commodity" },
        value: { text: commodityName },
        actions: { items: [{ href: "/commodities?returnTo=check-answers", text: "Change", visuallyHiddenText: "commodity" }] }
      }
    ]
  }) }}

  <form method="POST" action="/check-answers">
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">
    {{ govukButton({ text: "Accept and submit", preventDoubleClick: true }) }}
  </form>
{% endblock %}
```

### Confirmation page

```nunjucks
{% from "govuk/components/panel/macro.njk" import govukPanel %}

{% extends "layouts/page.njk" %}
{% set pageTitle = "Application submitted" %}

{% block mainContent %}
  {{ govukPanel({
    titleText: "Application submitted",
    html: "Your reference number<br><strong>" + referenceNumber + "</strong>"
  }) }}

  <p class="govuk-body">We have sent a confirmation to <strong>{{ userEmail }}</strong>.</p>

  <h2 class="govuk-heading-m">What happens next</h2>
  <p class="govuk-body">...</p>

  <p class="govuk-body">
    <a class="govuk-link" href="/notifications">View all notifications</a>
  </p>
{% endblock %}
```

---

## 7. Typography, spacing, and layout

**Typography:**

```html
<h1 class="govuk-heading-xl">Extra large heading</h1>
<h2 class="govuk-heading-l">Large heading</h2>
<h3 class="govuk-heading-m">Medium heading</h3>
<h4 class="govuk-heading-s">Small heading</h4>
<p class="govuk-body-l">Large body text</p>
<p class="govuk-body">Standard body text (default)</p>
<p class="govuk-body-s">Small body text</p>
<p class="govuk-body-lead">Lead paragraph (introductory)</p>
<a class="govuk-link" href="/path">Link text</a>
<a class="govuk-link govuk-link--no-visited-state" href="/path">Link (no purple visited)</a>
```

**Spacing overrides:**

```html
<p class="govuk-!-margin-top-6">6 units margin top</p>
<p class="govuk-!-margin-bottom-0">No bottom margin</p>
<div class="govuk-!-padding-4">4 units padding all sides</div>
```

Scale: 0, 1 (5px), 2 (10px), 3 (15px), 4 (20px), 5 (25px), 6 (30px), 7 (40px), 8 (50px), 9 (60px)

**Grid:**

```html
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    <!-- Main content (forms, questions) -->
  </div>
  <div class="govuk-grid-column-one-third">
    <!-- Sidebar -->
  </div>
</div>

<!-- Full width -->
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">
    <!-- Tables, wide content -->
  </div>
</div>
```

Grid column options: `full`, `one-half`, `one-third`, `two-thirds`, `one-quarter`, `three-quarters`

---

## 8. Accessibility

**What GOV.UK Frontend handles automatically:**
- ARIA `role="alert"` on error summary (triggers screen reader announcement)
- `aria-describedby` linking inputs to hint/error text
- `aria-expanded` on details component
- Keyboard navigation for all interactive components
- Focus management via `ErrorSummary.init()` (auto-focus on page load)
- High contrast mode compatibility
- Reduced motion support

**What you must do:**
- One `<h1>` per page — use `isPageHeading: true` on the main legend/label
- Meaningful `<title>` — `{% block pageTitle %}{{ pageTitle }} — {{ serviceName }}{% endblock %}`
- Include `<main id="main-content">` with skip link targeting it
- Error summary `errorList` items must `href` to the correct field ID
- `visuallyHiddenText` on "Change" links in summary lists (for screen readers)
- `autocomplete` on personal data fields — WCAG 1.3.5 requirement:

```nunjucks
{{ govukInput({
  id: "firstName",
  name: "firstName",
  autocomplete: "given-name",  // WCAG 1.3.5
  label: { text: "First name" }
}) }}
```

Common `autocomplete` values: `given-name`, `family-name`, `email`, `tel`, `bday`, `street-address`, `postal-code`

---

## 9. Custom project components

Components follow the `macro.njk` + `template.njk` pattern under `src/server/common/components/`:

```nunjucks
{# appHeading — page heading with optional caption #}
{% from "common/components/heading/macro.njk" import appHeading %}

{{ appHeading({
  text: "Where are the goods coming from?",
  caption: "New import notification",
  classes: "govuk-heading-xl"
}) }}
```

```nunjucks
{# appServiceHeader — project service header #}
{% from "common/components/service-header/macro.njk" import appServiceHeader %}

{{ appServiceHeader({
  serviceName: serviceName,
  navigation: navigation,
  signOutHref: "/auth/sign-out"
}) }}
```

---

## 10. Common mistakes

**1. Wrong import path**
```nunjucks
{# Wrong #}
{% from "govuk-frontend/components/input/macro.njk" import govukInput %}
{% from "node_modules/govuk-frontend/components/input/macro.njk" import govukInput %}

{# Correct #}
{% from "govuk/components/input/macro.njk" import govukInput %}
```

**2. Importing macros inside blocks**
```nunjucks
{# Wrong #}
{% extends "layouts/page.njk" %}
{% block mainContent %}
  {% from "govuk/components/input/macro.njk" import govukInput %}  {# too late #}

{# Correct #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% extends "layouts/page.njk" %}
```

**3. Forgetting `isPageHeading: true` on question pages**
```nunjucks
{# Wrong — no visible h1 for screen readers #}
{{ govukRadios({ fieldset: { legend: { text: "Question?" } } }) }}

{# Correct #}
{{ govukRadios({ fieldset: { legend: { text: "Question?", isPageHeading: true, classes: "govuk-fieldset__legend--l" } } }) }}
```

**4. Error summary items not linking to field IDs**
```js
// Wrong — href doesn't match the id in the govukSelect macro
{ text: "Select a country", href: "#country" }

// Correct — matches id: "countryCode" in govukSelect
{ text: "Select a country", href: "#countryCode" }
```

**5. Omitting CSRF token**
```nunjucks
{# Wrong #}
<form method="POST" action="/submit">

{# Correct #}
<form method="POST" action="/submit">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
```

**6. Passing string instead of error object**
```nunjucks
{# Wrong — errorMessage expects an object {text: '...'} #}
{{ govukInput({ errorMessage: errors.field }) }}

{# Correct #}
{{ govukInput({ errorMessage: errors.field and { text: errors.field } }) }}
```

**7. Placing error summary inside the form**
```nunjucks
{# Wrong #}
<form>
  {{ govukErrorSummary({ ... }) }}

{# Correct — error summary is before the form element #}
{{ govukErrorSummary({ ... }) }}
<form>
```

**8. Not re-populating form values after validation failure**
```js
// Wrong — user loses their input
return h.view('origin/origin', { errors, errorList })

// Correct — spread payload to re-populate fields
return h.view('origin/origin', {
  ...request.payload,
  errors,
  errorList
})
```

**9. Using `<button>` markup directly**
```nunjucks
{# Wrong — bypasses double-click prevention, GOV.UK styling, accessible type attribute #}
<button class="govuk-button">Continue</button>

{# Correct #}
{{ govukButton({ text: "Continue" }) }}
```

**10. Using `href="#"` on back links**
```nunjucks
{# Wrong #}
{{ govukBackLink({ text: "Back", href: "#" }) }}

{# Correct — real URL or JavaScript history.back() #}
{{ govukBackLink({ text: "Back", href: backLink }) }}
```

**11. Missing `visuallyHiddenText` on "Change" links**
```nunjucks
{# Wrong — screen reader says "Change Change Change" #}
actions: { items: [{ href: "/edit", text: "Change" }] }

{# Correct — screen reader says "Change country of origin" #}
actions: { items: [{ href: "/edit", text: "Change", visuallyHiddenText: "country of origin" }] }
```

**12. Using `html` param with user input (XSS)**
```nunjucks
{# Wrong — XSS if userText contains HTML #}
{{ govukSummaryList({ rows: [{ value: { html: userText } }] }) }}

{# Correct — use text for user-provided values #}
{{ govukSummaryList({ rows: [{ value: { text: userText } }] }) }}
```

**13. Breaking heading hierarchy**
```nunjucks
{# Wrong — skips from h1 to h3 #}
<h1 class="govuk-heading-l">Page title</h1>
<h3 class="govuk-heading-m">Section</h3>

{# Correct — sequential hierarchy #}
<h1 class="govuk-heading-l">Page title</h1>
<h2 class="govuk-heading-m">Section</h2>
```

**14. Not adding `autocomplete` to personal data fields**
```nunjucks
{# Wrong — fails WCAG 1.3.5 for personal data fields #}
{{ govukInput({ id: "email", name: "email", label: { text: "Email" } }) }}

{# Correct #}
{{ govukInput({ id: "email", name: "email", autocomplete: "email", label: { text: "Email" } }) }}
```

**15. Duplicate `<h1>` from `appHeading` + `isPageHeading: true`**

A page either uses the project `appHeading` macro **or** sets `isPageHeading: true` on the main form macro — never both. Both produce an `<h1>`, and two h1s on a page is a WCAG 1.3.1 violation.

```nunjucks
{# Wrong — two h1s on the page #}
{{ appHeading({ text: "Choose commodity" }) }}
{{ govukSelect({
  label: { text: "Choose commodity", isPageHeading: true, classes: "govuk-label--l" },
  ...
}) }}

{# Correct — pick one. For form-led pages, the macro's label is the page heading. #}
{{ govukSelect({
  label: { text: "Choose commodity", isPageHeading: true, classes: "govuk-label--l" },
  ...
}) }}
```

**16. Tables without a `<caption>`**

A `<table>` rendered next to a heading is not programmatically associated with it. Screen readers announce the table cold, with no context. Add a `<caption>` — visually hidden if the table sits under a visible heading.

```nunjucks
{# Wrong — no association between heading and table #}
<h2 class="govuk-heading-m">Documents added</h2>
<table class="govuk-table">
  <thead>...</thead>
</table>

{# Correct — caption is the table's accessible name #}
<table class="govuk-table">
  <caption class="govuk-visually-hidden">Documents added</caption>
  <thead>...</thead>
</table>

{# Or visible caption (use govuk-table__caption--m, not govuk-body) #}
<table class="govuk-table">
  <caption class="govuk-table__caption govuk-table__caption--m">Documents added</caption>
  <thead>...</thead>
</table>
```

**17. Inputs inside table rows without per-row labels**

The column header alone is not sufficient for a per-row input. A screen reader user navigating the inputs hears "5" without knowing which item or row it belongs to. Give each input an `aria-label` that includes the row context.

```nunjucks
{# Wrong — input has no row context for screen readers #}
<td class="govuk-table__cell">
  <input class="govuk-input govuk-input--width-3" name="count-{{ item.id }}" type="number">
</td>

{# Correct — aria-label binds the input to its row #}
<td class="govuk-table__cell">
  <input class="govuk-input govuk-input--width-3"
         name="count-{{ item.id }}"
         type="number"
         aria-label="Quantity for {{ item.name }}">
</td>
```

**18. `disabled` on non-form buttons that should remain perceivable**

The HTML `disabled` attribute removes a button from the keyboard tab order and the accessibility tree. For a "Continue" button that's blocked because some upstream condition isn't met (documents still scanning, no items added), use `aria-disabled="true"` paired with `aria-describedby` so screen reader users can still find the button and hear *why* it's blocked.

```nunjucks
{# Wrong — button vanishes from keyboard navigation, no explanation #}
{{ govukButton({ text: "Continue", disabled: true, href: "/next" }) }}

{# Correct — button stays focusable; screen reader hears the reason #}
<p id="cannot-continue-reason" class="govuk-visually-hidden">
  You cannot continue until all documents have been scanned.
</p>
{{ govukButton({
  text: "Continue",
  href: "/next",
  attributes: {
    'aria-disabled': 'true',
    'aria-describedby': 'cannot-continue-reason'
  }
}) }}
```

The handler / client-side code is responsible for actually preventing the action — `aria-disabled` is purely for assistive tech.

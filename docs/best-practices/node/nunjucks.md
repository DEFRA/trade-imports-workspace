# Nunjucks — Best Practices

Project baseline: Nunjucks with `@hapi/vision`, `autoescape: true`, `trimBlocks: true`, `lstripBlocks: true`. Used in both `trade-imports-animals-frontend` and `trade-imports-animals-admin`.

---

## 1. How this project configures Nunjucks

Both repos share an identical config at `src/config/nunjucks/nunjucks.js`:

```js
import nunjucks from 'docs/best-practices/node/nunjucks'
import path from 'path'
import {formatDate} from '../filters/format-date.js'
import {formatCurrency} from '../filters/format-currency.js'
import {assign} from 'lodash'

export const configureNunjucks = (server) => {
    const env = nunjucks.configure(
        [
            // Search paths — order matters, first match wins
            path.join(process.cwd(), 'node_modules/govuk-frontend/dist/'),
            path.join(process.cwd(), 'src/server/common/templates'),
            path.join(process.cwd(), 'src/server/common/components')
        ],
        {
            autoescape: true,          // HTML-escape all output by default
            throwOnUndefined: false,   // undefined variables render as empty string (not an error)
            trimBlocks: true,          // remove newline after block tags
            lstripBlocks: true,        // strip leading whitespace before block tags
            watch: false,              // don't watch files for changes (nodemon handles this)
            noCache: process.env.NODE_ENV === 'development'
        }
    )

    // Custom filters
    env.addFilter('formatDate', formatDate)            // date-fns based
    env.addFilter('formatCurrency', formatCurrency)    // Intl.NumberFormat based
    env.addFilter('assign', (obj, ...args) => assign({}, obj, ...args))  // lodash merge

    return env
}
```

---

## 2. Template directory structure

```
src/server/
├── common/
│   ├── templates/
│   │   └── layouts/
│   │       └── page.njk        ← project base layout (extends govuk/template.njk)
│   └── components/
│       ├── heading/
│       │   ├── macro.njk       ← component macro (appHeading)
│       │   └── template.njk    ← component template (included by macro)
│       └── service-header/
│           ├── macro.njk       ← appServiceHeader
│           └── template.njk
├── origin/
│   ├── index.js                ← route config
│   ├── controller.js           ← Hapi route handler
│   └── origin.njk              ← page template (extends layouts/page.njk)
```

---

## 3. Template inheritance

Three-level chain:

1. `govuk/template.njk` — GOV.UK Frontend base (HTML skeleton, head, body)
2. `layouts/page.njk` — project layout (header, footer, navigation)
3. `origin.njk` — page-specific content

```nunjucks
{# layouts/page.njk — extends GOV.UK base, adds project chrome #}
{% extends "govuk/template.njk" %}

{% block pageTitle %}{{ pageTitle }} — {{ serviceName }}{% endblock %}

{% block head %}
  <link rel="stylesheet" href="{{ getAssetPath('application.css') }}">
{% endblock %}

{% block bodyStart %}
  {% include "govuk/components/cookie-banner/template.njk" %}
{% endblock %}

{% block header %}
  {{ appServiceHeader({ serviceName: serviceName }) }}
{% endblock %}

{% block content %}
  <div class="govuk-width-container">
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
  <script src="{{ getAssetPath('application.js') }}"></script>
{% endblock %}
```

```nunjucks
{# origin.njk — page template #}
{% extends "layouts/page.njk" %}

{% set pageTitle = "Where are the goods coming from?" %}

{% block mainContent %}
  <h1 class="govuk-heading-l">{{ pageTitle }}</h1>
  {# page content here #}
{% endblock %}
```

Available blocks from `govuk/template.njk`:

| Block | Purpose |
|-------|---------|
| `pageTitle` | `<title>` content |
| `headIcons` | Favicon links |
| `head` | Additional `<head>` content |
| `bodyStart` | Before skip link (cookie banners) |
| `skipLink` | Skip to main content link |
| `header` | Page header |
| `main` | Entire `<main>` element |
| `content` | Width container + main wrapper |
| `footer` | Page footer |
| `bodyEnd` | Before closing `</body>` (scripts) |

---

## 4. `super()` — extending parent block content

```nunjucks
{# In a child template — append to parent block #}
{% block head %}
  {{ super() }}
  <meta name="description" content="{{ pageDescription }}">
{% endblock %}
```

---

## 5. `{% include %}` vs macros

| Use `{% include %}` | Use macros |
|--------------------|------------|
| Static content shared across templates | Reusable components that accept parameters |
| Partials that don't need parameters | Anything with variability |
| Layout chrome (header/footer) | Form fields, UI components |

```nunjucks
{# Include — no parameters #}
{% include "partials/breadcrumbs.njk" %}

{# Macro — accepts parameters #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{{ govukInput({ id: "email", name: "email", label: { text: "Email address" } }) }}
```

---

## 6. Macros — defining and using

**Defining a macro:**

```nunjucks
{# common/components/heading/macro.njk #}
{% macro appHeading(params) %}
  {% include "common/components/heading/template.njk" %}
{% endmacro %}
```

```nunjucks
{# common/components/heading/template.njk #}
<h1 class="govuk-heading-xl {{ params.classes }}">
  {{ params.text }}
  {% if params.caption %}
    <span class="govuk-caption-xl">{{ params.caption }}</span>
  {% endif %}
</h1>
```

**Importing and calling:**

```nunjucks
{# Always import at the TOP of the file, before any extends or blocks #}
{% from "common/components/heading/macro.njk" import appHeading %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}

{% block mainContent %}
  {{ appHeading({ text: "Page title", caption: "Section" }) }}
{% endblock %}
```

**Macro with defaults:**

```nunjucks
{% macro statusTag(params) %}
  {% set colour = params.colour if params.colour else "grey" %}
  {% set text = params.text if params.text else "Unknown" %}
  <strong class="govuk-tag govuk-tag--{{ colour }}">{{ text }}</strong>
{% endmacro %}
```

---

## 7. GOV.UK Frontend macros — import and usage

All GOV.UK components are at `govuk/components/{name}/macro.njk`. The macro name follows the pattern `govuk{ComponentName}`.

**Import syntax:**
```nunjucks
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/fieldset/macro.njk" import govukFieldset %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/pagination/macro.njk" import govukPagination %}
{% from "govuk/components/breadcrumbs/macro.njk" import govukBreadcrumbs %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}
{% from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/details/macro.njk" import govukDetails %}
{% from "govuk/components/tag/macro.njk" import govukTag %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}
{% from "govuk/components/date-input/macro.njk" import govukDateInput %}
```

**Text input:**
```nunjucks
{{ govukInput({
  id: "referenceNumber",
  name: "referenceNumber",
  value: referenceNumber,
  label: {
    text: "Reference number",
    classes: "govuk-label--m",
    isPageHeading: true
  },
  hint: { text: "For example, DRAFT.IMP.2026.123" },
  errorMessage: errors.referenceNumber and { text: errors.referenceNumber },
  autocomplete: "off",
  classes: "govuk-input--width-20"
}) }}
```

**Radios:**
```nunjucks
{{ govukRadios({
  idPrefix: "requiresRegionCode",
  name: "requiresRegionCode",
  fieldset: {
    legend: {
      text: "Does the origin have a region code?",
      isPageHeading: true,
      classes: "govuk-fieldset__legend--l"
    }
  },
  hint: { text: "Select one option" },
  errorMessage: errors.requiresRegionCode and { text: errors.requiresRegionCode },
  value: requiresRegionCode,
  items: [
    { value: "yes", text: "Yes" },
    { value: "no", text: "No" }
  ]
}) }}
```

**Checkboxes:**
```nunjucks
{{ govukCheckboxes({
  idPrefix: "certifications",
  name: "certifications",
  fieldset: {
    legend: {
      text: "Which certifications apply?",
      classes: "govuk-fieldset__legend--m"
    }
  },
  errorMessage: errors.certifications and { text: errors.certifications },
  items: [
    { value: "health", text: "Health certificate", checked: "health" in certifications },
    { value: "origin", text: "Certificate of origin", checked: "origin" in certifications }
  ]
}) }}
```

**Select:**
```nunjucks
{{ govukSelect({
  id: "countryCode",
  name: "countryCode",
  label: { text: "Country of origin", classes: "govuk-label--m" },
  errorMessage: errors.countryCode and { text: errors.countryCode },
  value: countryCode,
  items: [{ value: "", text: "Select a country" }] + countryOptions
}) }}
```

**Button:**
```nunjucks
{{ govukButton({ text: "Continue" }) }}
{{ govukButton({ text: "Save as draft", classes: "govuk-button--secondary" }) }}
{{ govukButton({ text: "Delete", classes: "govuk-button--warning", preventDoubleClick: true }) }}
```

**Error summary** — always at top of form, before form element:
```nunjucks
{% if errors %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errors | list | map(attribute="message") | list
  }) }}
{% endif %}
```

Better pattern — build errorList in controller and pass to template:
```nunjucks
{% if errorList %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errorList
  }) }}
{% endif %}
```

**Summary list:**
```nunjucks
{{ govukSummaryList({
  rows: [
    {
      key: { text: "Country of origin" },
      value: { text: countryName },
      actions: {
        items: [{ href: "/origin?returnTo=check-answers", text: "Change", visuallyHiddenText: "country of origin" }]
      }
    },
    {
      key: { text: "Commodity" },
      value: { text: commodityName }
    }
  ]
}) }}
```

**Notification banner:**
```nunjucks
{{ govukNotificationBanner({
  type: "success",
  html: "<h3 class=\"govuk-notification-banner__heading\">Notification submitted</h3>"
}) }}
```

**Breadcrumbs:**
```nunjucks
{{ govukBreadcrumbs({
  items: [
    { text: "Home", href: "/" },
    { text: "Notifications", href: "/notifications" },
    { text: "New notification" }
  ]
}) }}
```

**Back link:**
```nunjucks
{{ govukBackLink({ text: "Back", href: backLink }) }}
```

**Phase banner:**
```nunjucks
{{ govukPhaseBanner({
  tag: { text: "Beta" },
  html: 'This is a new service – <a class="govuk-link" href="/feedback">give us your feedback</a>.'
}) }}
```

**Date input:**
```nunjucks
{{ govukDateInput({
  id: "arrivalDate",
  namePrefix: "arrivalDate",
  fieldset: {
    legend: { text: "What is the expected arrival date?", isPageHeading: true, classes: "govuk-fieldset__legend--l" }
  },
  hint: { text: "For example, 27 3 2026" },
  errorMessage: errors.arrivalDate and { text: errors.arrivalDate },
  items: [
    { name: "day",   classes: "govuk-input--width-2", value: arrivalDate.day },
    { name: "month", classes: "govuk-input--width-2", value: arrivalDate.month },
    { name: "year",  classes: "govuk-input--width-4", value: arrivalDate.year }
  ]
}) }}
```

---

## 8. Variables and context

All context passed from `h.view('template', context)` is available in the template. Global context from `configureNunjucks` is available in every template:

| Variable | Type | Purpose |
|---------|------|---------|
| `serviceName` | string | Service name for header |
| `userSession` | object | Current user's session data |
| `navigation` | array | Navigation items |
| `breadcrumbs` | array | Breadcrumb trail |
| `getAssetPath` | function | Returns versioned asset URL |
| `authEnabled` | boolean | Whether auth is active |

```nunjucks
{# Accessing context #}
<p>Welcome, {{ userSession.user.name }}</p>
<p>{{ serviceName }}</p>

{# With default fallback #}
{{ referenceNumber | default("Not yet assigned") }}

{# Conditional on presence #}
{% if errors %}...{% endif %}
```

---

## 9. Built-in filters

| Filter | Example | Output |
|--------|---------|--------|
| `upper` | `{{ "hello" \| upper }}` | `HELLO` |
| `lower` | `{{ "HELLO" \| lower }}` | `hello` |
| `title` | `{{ "hello world" \| title }}` | `Hello World` |
| `capitalize` | `{{ "hello" \| capitalize }}` | `Hello` |
| `trim` | `{{ "  hi  " \| trim }}` | `hi` |
| `truncate(n)` | `{{ "hello world" \| truncate(5) }}` | `hello...` |
| `replace(a,b)` | `{{ "hello" \| replace("l","r") }}` | `herro` |
| `join(sep)` | `{{ [1,2,3] \| join(", ") }}` | `1, 2, 3` |
| `sort` | `{{ items \| sort }}` | sorted array |
| `groupby(attr)` | `{{ items \| groupby("type") }}` | grouped object |
| `list` | `{{ obj \| list }}` | array of values |
| `dump` | `{{ obj \| dump }}` | JSON string (debug) |
| `safe` | `{{ html \| safe }}` | output without escaping |
| `escape` | `{{ text \| escape }}` | HTML-escaped string |
| `first` | `{{ items \| first }}` | first element |
| `last` | `{{ items \| last }}` | last element |
| `length` | `{{ items \| length }}` | count |
| `int` | `{{ "3" \| int }}` | `3` |
| `float` | `{{ "3.5" \| float }}` | `3.5` |
| `round(n)` | `{{ 3.567 \| round(2) }}` | `3.57` |
| `wordcount` | `{{ text \| wordcount }}` | word count |
| `batch(n)` | `{{ items \| batch(3) }}` | array of chunks |
| `reject(attr)` | `{{ items \| reject("checked") }}` | items without attr |
| `select(attr)` | `{{ items \| select("checked") }}` | items with attr |

**Custom filters (this project):**
```nunjucks
{{ createdAt | formatDate("d MMMM yyyy") }}       {# "10 April 2026" #}
{{ price | formatCurrency }}                       {# "£1,234.56" #}
{{ obj | assign({ extraKey: "value" }) }}          {# merged object #}
```

---

## 10. Adding custom filters

In `nunjucks.js`:

```js
env.addFilter('formatDate', (date, format = 'dd/MM/yyyy') => {
  if (!date) return ''
  return formatDate(new Date(date), format, { locale: enGB })
})

// Async filter
env.addFilter('fetchLabel', async (code, callback) => {
  const label = await labelService.getLabel(code)
  callback(null, label)
}, true)  // true = async
```

---

## 11. Control flow

```nunjucks
{# if / elif / else — use == / != in Nunjucks, NOT === / !== (see §17 #11) #}
{% if status == "APPROVED" %}
  <p class="govuk-body">Approved</p>
{% elif status == "REJECTED" %}
  <p class="govuk-body govuk-!-color-red">Rejected</p>
{% else %}
  <p class="govuk-body">Pending</p>
{% endif %}

{# for loop #}
{% for item in notifications %}
  <p>{{ item.referenceNumber }}</p>
{% else %}
  <p>No notifications found.</p>
{% endfor %}

{# Loop variables #}
{% for item in items %}
  {% if loop.first %}<ul>{% endif %}
  <li class="{% if loop.last %}last{% endif %}">
    {{ loop.index }}. {{ item.text }}
  </li>
  {% if loop.last %}</ul>{% endif %}
{% endfor %}

{# set #}
{% set pageTitle = "Origin of the import" %}
{% set errorCount = errors | length %}

{# set block (multiline) #}
{% set addressHtml %}
  <p>{{ address.line1 }}</p>
  <p>{{ address.city }}, {{ address.postcode }}</p>
{% endset %}
{{ govukSummaryList({ rows: [{ value: { html: addressHtml } }] }) }}
```

Loop variables:

| Variable | Value |
|---------|-------|
| `loop.index` | 1-based index |
| `loop.index0` | 0-based index |
| `loop.first` | `true` on first iteration |
| `loop.last` | `true` on last iteration |
| `loop.length` | Total count |
| `loop.revindex` | Reverse 1-based index |

---

## 12. Whitespace control

`trimBlocks: true` removes the newline after `%}`. `lstripBlocks: true` removes whitespace before `{%`. These are already set in this project's config — don't disable them.

Manual whitespace trimming with `-`:
```nunjucks
{%- if condition -%}
  content
{%- endif -%}
```

---

## 13. Safe HTML

`| safe` disables HTML escaping for a specific value. Only use for **server-generated HTML you control**. Never on user input.

```nunjucks
{# Correct — server-generated HTML passed from controller #}
{{ confirmationHtml | safe }}

{# Correct — summary list value containing links #}
{% set addressHtml %}<a href="/address/edit">{{ address }}</a>{% endset %}
{{ govukSummaryList({ rows: [{ value: { html: addressHtml } }] }) }}

{# WRONG — never on user input #}
{{ userInputFromForm | safe }}  {# XSS vulnerability #}
```

GOV.UK macro params: use `text` for plain text (auto-escaped), use `html` for HTML content (must be trusted):
```nunjucks
{# text — safe, auto-escaped #}
{{ govukInput({ label: { text: userProvidedName } }) }}

{# html — only for trusted server-generated content #}
{{ govukSummaryList({ rows: [{ value: { html: "<a href=...>...</a>" } }] }) }}
```

---

## 14. Globals and context functions

```js
// In nunjucks.js — available in every template
env.addGlobal('year', new Date().getFullYear())
env.addGlobal('getAssetPath', (file) => `/public/assets/${file}`)
env.addGlobal('appVersion', process.env.APP_VERSION ?? 'dev')
```

```nunjucks
{# Use globals in any template without passing in context #}
<p>&copy; {{ year }} Crown copyright</p>
<img src="{{ getAssetPath('images/logo.png') }}" alt="Logo">
```

Per-request context (from Vision's `context` function in server config) — adds to every view:

```js
context: async (request) => ({
  serviceName: config.get('serviceName'),
  userSession: request.auth?.credentials,
  navigation: buildNavigation(request),
  breadcrumbs: request.app.breadcrumbs ?? []
})
```

---

## 15. Hapi controller → template data flow

```js
// controller.js
export const originController = {
  handler: async (request, h) => {
    const { countryCode, errors } = request.app

    // Fetch data
    const countries = await referenceDataClient.getCountries(request)

    // Build error list for error summary
    const errorList = errors
      ? Object.entries(errors).map(([field, message]) => ({
          text: message,
          href: `#${field}`
        }))
      : null

    // Pass context to template
    return h.view('origin/origin', {
      pageTitle: 'Where are the goods coming from?',
      countryCode,
      countryOptions: countries.map(c => ({ value: c.code, text: c.name })),
      errors,      // field-level errors: { countryCode: 'Select a country' }
      errorList    // for error summary component
    })
  }
}
```

```nunjucks
{# origin.njk #}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% extends "layouts/page.njk" %}

{% set pageTitle = "Where are the goods coming from?" %}

{% block mainContent %}
  <h1 class="govuk-heading-l">{{ pageTitle }}</h1>

  {% if errorList %}
    {{ govukErrorSummary({ titleText: "There is a problem", errorList: errorList }) }}
  {% endif %}

  <form method="POST" action="/origin">
    <input type="hidden" name="_csrf" value="{{ csrfToken }}">

    {{ govukSelect({
      id: "countryCode",
      name: "countryCode",
      label: { text: "Country of origin", classes: "govuk-label--m" },
      errorMessage: errors.countryCode and { text: errors.countryCode },
      value: countryCode,
      items: [{ value: "", text: "Select a country" }] + countryOptions
    }) }}

    {{ govukButton({ text: "Continue" }) }}
  </form>
{% endblock %}
```

---

## 16. Error patterns and debugging

Common Nunjucks errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Template Not Found` | Wrong path in `extends` or `from` | Check search path order; `govuk/components/` not `govuk-frontend/` |
| `Error: 'X' is not defined` | `throwOnUndefined: true` | Set to `false` or pass all required vars |
| `Error: expected block end` | Unclosed `{% block %}` | Check every block has `{% endblock %}` |
| Output contains literal `{%...%}` | Used inside a string with quotes | Ensure tag is outside string context |
| Empty output where content expected | `undefined` variable with `autoescape` | Check controller passes all required context |

Debug with `dump` filter:
```nunjucks
<pre>{{ someObject | dump(2) }}</pre>
```

Set `noCache: true` in development to see template changes without restart.

---

## 17. Common agent mistakes

**1. Importing macros inside a block instead of at file top**
```nunjucks
{# Wrong #}
{% extends "layouts/page.njk" %}
{% block mainContent %}
  {% from "govuk/components/input/macro.njk" import govukInput %}  {# ← wrong position #}
{% endblock %}

{# Correct — import before extends #}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% extends "layouts/page.njk" %}
{% block mainContent %}
  {{ govukInput(...) }}
{% endblock %}
```

**2. Wrong import path for GOV.UK components**
```nunjucks
{# Wrong #}
{% from "govuk-frontend/components/input/macro.njk" import govukInput %}
{% from "node_modules/govuk-frontend/components/input/macro.njk" import govukInput %}

{# Correct #}
{% from "govuk/components/input/macro.njk" import govukInput %}
```

**3. Using `{{ }}` for control flow**
```nunjucks
{# Wrong #}
{{ if condition }}...{{ endif }}

{# Correct #}
{% if condition %}...{% endif %}
```

**4. Passing string instead of object to `errorMessage`**
```nunjucks
{# Wrong #}
{{ govukInput({ errorMessage: errors.field }) }}

{# Correct #}
{{ govukInput({ errorMessage: errors.field and { text: errors.field } }) }}
```

**5. Not including CSRF token in forms**
```nunjucks
{# Wrong — form without CSRF #}
<form method="POST" action="/submit">
  ...
</form>

{# Correct #}
<form method="POST" action="/submit">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  ...
</form>
```

**6. Using `| safe` on user input (XSS)**
```nunjucks
{# WRONG — security vulnerability #}
{{ request.query.searchTerm | safe }}

{# Correct — autoescape handles it #}
{{ request.query.searchTerm }}
```

**7. Forgetting `isPageHeading: true` on question pages**
```nunjucks
{# Wrong — loses h1 for screen readers #}
{{ govukRadios({ fieldset: { legend: { text: "Question?" } }, ... }) }}

{# Correct #}
{{ govukRadios({ fieldset: { legend: { text: "Question?", isPageHeading: true, classes: "govuk-fieldset__legend--l" } }, ... }) }}
```

**8. Variable scoping in for loops**
```nunjucks
{# Wrong — 'found' set inside loop may not behave as expected in all Nunjucks versions #}
{% for item in items %}
  {% if item.active %}{% set found = true %}{% endif %}
{% endfor %}
{{ found }}  {# may be undefined #}

{# Correct — set before loop, use namespace for mutation #}
{% set ns = namespace(found=false) %}
{% for item in items %}
  {% if item.active %}{% set ns.found = true %}{% endif %}
{% endfor %}
{{ ns.found }}
```

**9. Error summary items not linked to field IDs**
```nunjucks
{# Wrong — href doesn't match field id #}
{ text: "Enter a country", href: "#country" }  {# but input id is "countryCode" #}

{# Correct #}
{ text: "Enter a country", href: "#countryCode" }  {# matches id in govukSelect #}
```

**10. Using raw HTML instead of GOV.UK macros**
```nunjucks
{# Wrong — bypasses accessible markup, focus management, error state handling #}
<input type="text" id="name" name="name" class="govuk-input">

{# Correct #}
{{ govukInput({ id: "name", name: "name", label: { text: "Full name" } }) }}
```

**11. Using `===` / `!==` in `{% if %}` — undefined behaviour**

Nunjucks operators are `==` / `!=` (and `eq` / `ne`). `===` / `!==` are not part of the Nunjucks expression grammar — they are silently parsed as something else and produce results that look right in some cases and fail in others. Never use them in templates.

```nunjucks
{# Wrong — silent undefined behaviour #}
{% if status === "APPROVED" %}...{% endif %}
{% if doc.scanStatus !== "PENDING" %}...{% endif %}

{# Correct #}
{% if status == "APPROVED" %}...{% endif %}
{% if doc.scanStatus != "PENDING" %}...{% endif %}
```

**12. Chained property access without null guards**

Nunjucks's `throwOnUndefined: false` only protects the *final* missing key. Accessing `notification.commodity.commodityComplement.length` still throws if `notification.commodity` is null, because each intermediate hop is evaluated. Guard each hop you need.

```nunjucks
{# Wrong — throws if notification.commodity is null #}
{% if notification.commodity.commodityComplement.length %}...{% endif %}

{# Correct — guard each hop #}
{% if notification.commodity
   and notification.commodity.commodityComplement
   and notification.commodity.commodityComplement.length %}
  ...
{% endif %}
```

**13. Rendering raw enum / camelCase API values directly**

Backend constants like `VETERINARY_HEALTH_CERTIFICATE`, `placeOfDestination`, `certifiedFor` are not user-facing strings. Render via a `label` filter with an explicit override map and a generic camelCase-to-Sentence-case fallback.

```js
// nunjucks.js — register filter
const overrides = {
  VETERINARY_HEALTH_CERTIFICATE: 'Veterinary health certificate',
  ITAHC: 'ITAHC',
  placeOfDestination: 'Place of destination'
}
env.addFilter('label', (value) =>
  overrides[value] ?? value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()
)
```

```nunjucks
{# In templates — never render the raw value #}
{{ document.documentType | label }}        {# "Veterinary health certificate" #}
{{ notification.reasonForImport | label }} {# "Internal market" #}
```

**14. Silent `else` branches in status mappings**

A bare `else` after known status branches will quietly mis-render any status the team adds later. Make the known branches explicit and surface unexpected values rather than swallowing them.

```nunjucks
{# Wrong — every unknown status renders as "Checking" #}
{% if doc.scanStatus == "COMPLETE" %}<strong class="govuk-tag govuk-tag--green">Clean</strong>
{% elif doc.scanStatus == "REJECTED" %}<strong class="govuk-tag govuk-tag--red">Rejected</strong>
{% else %}<strong class="govuk-tag govuk-tag--blue">Checking</strong>
{% endif %}

{# Correct — PENDING is explicit; truly unknown values are visible, not silent #}
{% if doc.scanStatus == "COMPLETE" %}<strong class="govuk-tag govuk-tag--green">Clean</strong>
{% elif doc.scanStatus == "REJECTED" %}<strong class="govuk-tag govuk-tag--red">Rejected</strong>
{% elif doc.scanStatus == "PENDING" %}<strong class="govuk-tag govuk-tag--blue">Checking</strong>
{% else %}<strong class="govuk-tag govuk-tag--grey">Unknown ({{ doc.scanStatus }})</strong>
{% endif %}
```

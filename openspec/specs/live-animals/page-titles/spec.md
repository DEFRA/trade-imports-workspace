# Page Titles Specification

## Purpose

What the browser tab and the screen reader announce for a page of the service, and how that changes when the page is showing errors. The page's own visible heading is specified by the capability for that screen.

## Requirements

### Requirement: Every page's title names the page, then the service, then GOV.UK, joined by hyphens
**ID**: REQ-PAGE-TITLE-001
The system MUST title every page with the page's own name, then the service name, then the GOV.UK brand word, in that order and joined by hyphens. The system MUST NOT separate them with a pipe.

#### Scenario: A page's title reads page name, service name, GOV.UK
**ID**: SCN-PAGE-TITLE-001-A
- **GIVEN** the user is on a page of the service that carries a name of its own
- **WHEN** the page's title is read
- **THEN** it reads that page's name, then the service name, then GOV.UK, joined by hyphens

#### Scenario: The parts are not separated by a pipe
**ID**: SCN-PAGE-TITLE-001-B
- **GIVEN** a page of the service
- **WHEN** its title is built
- **THEN** no pipe separates the page name, the service name and GOV.UK

### Requirement: A page showing errors opens its whole title with an error prefix
**ID**: REQ-PAGE-TITLE-002
The system MUST open the title of a page showing errors with an error prefix, ahead of the page's own name, so the whole title — not only the page name — is marked as being in error.

#### Scenario: The error prefix opens the title while errors are shown
**ID**: SCN-PAGE-TITLE-002-A
- **GIVEN** the user has submitted a page that answers back with an error summary
- **WHEN** the page's title is read
- **THEN** it opens with the error prefix, followed by the page's name, the service name and GOV.UK as before

# Plants Page Titles Specification

## Purpose

What the browser tab and the screen reader announce for a page of the high-risk plants service, and how that changes when the page is showing errors. The page's own visible heading is specified by the capability for that screen.

## Requirements

### Requirement: Every page's title names the page, then the service, then GOV.UK, joined by hyphens
**ID**: REQ-PLANTS-PAGE-TITLE-001
The system MUST title every page with the page's own name, then the service name, then the GOV.UK brand word, in that order and joined by hyphens. The system MUST NOT separate them with a pipe.

#### Scenario: A page's title reads page name, service name, GOV.UK
**ID**: SCN-PLANTS-PAGE-TITLE-001-A
- **GIVEN** the user is on a page of the service that carries a name of its own, such as the commodity type page
- **WHEN** the page's title is read
- **THEN** it reads that page's name, then the service name, then GOV.UK, joined by hyphens, such as `What are you importing? - Import notification service - GOV.UK`

#### Scenario: The parts are not separated by a pipe
**ID**: SCN-PLANTS-PAGE-TITLE-001-B
- **GIVEN** a page of the service
- **WHEN** its title is built
- **THEN** no pipe separates the page name, the service name and GOV.UK

### Requirement: A page showing errors opens its whole title with an error prefix
**ID**: REQ-PLANTS-PAGE-TITLE-002
The system MUST open the title of a page showing errors with an error prefix, ahead of the page's own name, so the whole title — not only the page name — is marked as being in error.

#### Scenario: The error prefix opens the title while errors are shown
**ID**: SCN-PLANTS-PAGE-TITLE-002-A
- **GIVEN** the user has submitted a page that answers back with an error summary, such as the commodity type page with nothing chosen
- **WHEN** the page's title is read
- **THEN** it opens with the error prefix, followed by the page's name, the service name and GOV.UK as before

### Requirement: An error page's title follows the same pattern
**ID**: REQ-PLANTS-PAGE-TITLE-003
The system MUST title its error pages with the error's name, then the service name, then the GOV.UK brand word, joined by hyphens, as it titles every other page.

#### Scenario: A page that does not exist is titled Page not found - Import notification service - GOV.UK
**ID**: SCN-PLANTS-PAGE-TITLE-003-A
- **GIVEN** a signed-in user
- **WHEN** they open a page that does not exist
- **THEN** the title reads `Page not found - Import notification service - GOV.UK`

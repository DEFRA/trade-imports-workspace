# INS Page Titles Specification

## Purpose

What the browser tab and the screen reader announce for a page of the Import notification service front door, and how that changes when the page is showing errors. Each page's visible heading is specified by the capability for that screen (`ins/address-book`, `ins/notification-dashboard`).

## Requirements

### Requirement: Every page's title names the page, then the service, then GOV.UK, joined by hyphens
**ID**: REQ-INS-PAGE-TITLE-001
The system MUST title every page with the page's own name, then the service name, then the GOV.UK brand word, in that order and joined by hyphens. The system MUST NOT separate them with a pipe. The home page is titled Dashboard. An address's own page is titled with that address's name; the delete page is titled 'Delete this address?'; the edit page is titled 'Edit address and contact details'; the add page is titled 'Add address and contact details'.

#### Scenario: A page's title reads page name, service name, GOV.UK
**ID**: SCN-INS-PAGE-TITLE-001-A
- **GIVEN** a signed-in trader is on a page of the front door that carries a name of its own, such as the address book
- **WHEN** the page's title is read
- **THEN** it reads that page's name, then the service name, then GOV.UK, joined by hyphens, such as `Address book - Import notification service - GOV.UK`

#### Scenario: The parts are not separated by a pipe
**ID**: SCN-INS-PAGE-TITLE-001-B
- **GIVEN** a page of the front door
- **WHEN** its title is built
- **THEN** no pipe separates the page name, the service name and GOV.UK

#### Scenario: The home is titled Dashboard - Import notification service - GOV.UK
**ID**: SCN-INS-PAGE-TITLE-001-C
- **GIVEN** a signed-in trader
- **WHEN** they open the home
- **THEN** the title reads `Dashboard - Import notification service - GOV.UK`

#### Scenario: An address's own page is titled with its name
**ID**: SCN-INS-PAGE-TITLE-001-D
- **GIVEN** a signed-in trader with an address in their book
- **WHEN** they open that address's page
- **THEN** the title reads `<address name> - Import notification service - GOV.UK`

#### Scenario: The delete page is titled Delete this address?
**ID**: SCN-INS-PAGE-TITLE-001-E
- **GIVEN** a signed-in trader with an address in their book
- **WHEN** they open that address's delete page
- **THEN** the title reads `Delete this address? - Import notification service - GOV.UK`

#### Scenario: The edit page is titled Edit address and contact details
**ID**: SCN-INS-PAGE-TITLE-001-F
- **GIVEN** a signed-in trader with an address in their book
- **WHEN** they open that address's edit page
- **THEN** the title reads `Edit address and contact details - Import notification service - GOV.UK`

#### Scenario: The add page is titled Add address and contact details
**ID**: SCN-INS-PAGE-TITLE-001-G
- **GIVEN** a signed-in trader who follows 'Add a new address' from a notification's role picker
- **WHEN** the add page opens
- **THEN** the title reads `Add address and contact details - Import notification service - GOV.UK`

#### Scenario: The add page reached from the address book is titled Add address and contact details
**ID**: SCN-INS-PAGE-TITLE-001-H
- **GIVEN** a signed-in trader who follows 'Add a new address' from their address book
- **WHEN** the add page opens
- **THEN** the title reads `Add address and contact details - Import notification service - GOV.UK`

### Requirement: A page showing errors opens its whole title with an error prefix
**ID**: REQ-INS-PAGE-TITLE-002
The system MUST open the title of a page showing errors with an error prefix, ahead of the page's own name, so the whole title — not only the page name — is marked as being in error.

#### Scenario: The error prefix opens the title while errors are shown
**ID**: SCN-INS-PAGE-TITLE-002-A
- **GIVEN** the trader has submitted a page that answers back with an error summary, such as the add address page with nothing filled in
- **WHEN** the page's title is read
- **THEN** it opens with the error prefix, followed by the page's name, the service name and GOV.UK as before, such as `Error: Add address and contact details - Import notification service - GOV.UK`

### Requirement: An error page's title follows the same pattern
**ID**: REQ-INS-PAGE-TITLE-003
The system MUST title its error pages with the error's name, then the service name, then the GOV.UK brand word, joined by hyphens, as it titles every other page.

#### Scenario: A page that does not exist is titled Page not found - Import notification service - GOV.UK
**ID**: SCN-INS-PAGE-TITLE-003-A
- **GIVEN** a signed-in trader
- **WHEN** they open a page that does not exist
- **THEN** the title reads `Page not found - Import notification service - GOV.UK`

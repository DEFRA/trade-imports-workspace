# Transited Countries Page Specification

## Purpose

Asks which countries the consignment travels through on its way. The user searches for each country or territory the reference data service serves and adds them one at a time to a list, rather than ticking them in a set of checkboxes. The page is titled "Which countries will the consignment travel through?", its browser title is "Transit countries - Import notification service - GOV.UK", and it is asked only when the means of transport to the port of entry is rail or road and the country of origin and a commodity are saved.

## Requirements

### Requirement: The page asks for transited countries one at a time by search, starting with an empty list
**ID**: REQ-TRANSIT-COUNTRIES-001
The system MUST let the user search for and add one transited country at a time, offering a labelled search field and an "Add country" action, and MUST start a fresh notification with no countries added, showing no country list and no sentence saying none have been added, and no cap mentioned up front.

#### Scenario: The page presents an empty list with a search field and no cap stated
**ID**: SCN-TRANSIT-COUNTRIES-001-A
- **GIVEN** the user has reached the transited countries page for a fresh notification
- **WHEN** the page loads
- **THEN** it offers a labelled country search and an "Add country" action
- **AND** no country list is shown and no sentence says that no countries have been added, with no cap mentioned

### Requirement: Each added country is listed with its own Remove control, and the list persists
**ID**: REQ-TRANSIT-COUNTRIES-002
The system MUST show every added country as a row in a table with its own Remove action, MUST let the user remove a row without affecting the others, MUST announce each addition and removal to assistive technology, and MUST show the same countries again when the page is reopened after saving.

#### Scenario: Adding a country lists it with a Remove control and announces it
**ID**: SCN-TRANSIT-COUNTRIES-002-A
- **GIVEN** the user is on the transited countries page
- **WHEN** they add a country
- **THEN** it appears as a row in a table, with its own Remove control
- **AND** the addition is announced to assistive technology

#### Scenario: Removing a country takes only that row away and announces it
**ID**: SCN-TRANSIT-COUNTRIES-002-B
- **GIVEN** the user has added more than one country
- **WHEN** they remove one of them
- **THEN** only that country's row is taken away, leaving the others
- **AND** the removal is announced to assistive technology

#### Scenario: Saved countries are shown again on return
**ID**: SCN-TRANSIT-COUNTRIES-002-C
- **GIVEN** the user has added countries and saved the page
- **WHEN** they reopen the transited countries page
- **THEN** every saved country is shown in the table

### Requirement: Saving with no countries added is accepted
**ID**: REQ-TRANSIT-COUNTRIES-003
The system MUST accept the transited countries page being saved with none added, without showing an error, since the question is optional.

#### Scenario: Continuing with nothing added succeeds
**ID**: SCN-TRANSIT-COUNTRIES-003-A
- **GIVEN** the user is on the transited countries page with no countries added
- **WHEN** they save and continue
- **THEN** the page saves without an error summary, and the transporter list is shown
- **AND** no countries are listed if they return to the page

#### Scenario: Save and continue saves the countries in the order added and shows the transporter list
**ID**: SCN-TRANSIT-COUNTRIES-003-B
- **GIVEN** the user is on the transited countries page with countries added
- **WHEN** they save and continue
- **THEN** the countries are saved in the order they were added
- **AND** the transporter list is shown

### Requirement: Adding a country is refused when the entry is blank, not offered, already added, or the cap is reached
**ID**: REQ-TRANSIT-COUNTRIES-004
The system MUST refuse to add a country when the search field is left blank, when the entry is not one of the offered countries or territories, or when it has already been added, in each case naming the reason and linking to and focusing the search field. The system MUST NOT render a rejected entry back as an added row, whatever it contains.

#### Scenario: Pressing Add with nothing chosen is refused
**ID**: SCN-TRANSIT-COUNTRIES-004-A
- **GIVEN** the user presses "Add country" with the search field empty
- **WHEN** the page responds
- **THEN** an error tells them to enter a country to add, linking to and focusing the search field

#### Scenario: A country already added is refused by name
**ID**: SCN-TRANSIT-COUNTRIES-004-B
- **GIVEN** the user has already added a country
- **WHEN** they try to add the same country again
- **THEN** an error names that country as already added
- **AND** the list still holds only the one entry

#### Scenario: A refused country stays in the search box
**ID**: SCN-TRANSIT-COUNTRIES-004-D
- **GIVEN** the user tries to add a country that has already been added
- **WHEN** the page responds with the refusal
- **THEN** that country is still in the search box

#### Scenario: An out-of-list or tampered entry is refused and never rendered back
**ID**: SCN-TRANSIT-COUNTRIES-004-C
- **GIVEN** a country or territory code that is not one of the offered options, however it was submitted
- **WHEN** the page responds
- **THEN** an error tells the user to select a country from the list, linking to and focusing the search field
- **AND** the rejected value is not added to the list or rendered back onto the page as markup

### Requirement: Transited countries are capped at twelve
**ID**: REQ-TRANSIT-COUNTRIES-005
The system MUST refuse to add a thirteenth transited country, and once twelve are added MUST remove the search field and the Add action and instead state that the limit is reached, until a country is removed. The system MUST also refuse a save carrying more than twelve countries, however it was submitted, naming the limit.

#### Scenario: Reaching twelve removes the search and states the limit
**ID**: SCN-TRANSIT-COUNTRIES-005-A
- **GIVEN** the user has added eleven countries
- **WHEN** they add a twelfth
- **THEN** the search field and "Add country" action are no longer shown
- **AND** the message that announces the twelfth country also states that the limit of twelve is reached, and is announced to assistive technology

#### Scenario: Removing a country at the limit brings the search back
**ID**: SCN-TRANSIT-COUNTRIES-005-B
- **GIVEN** the user has reached the limit of twelve countries
- **WHEN** they remove one
- **THEN** the search field is offered again

#### Scenario: A save carrying more than twelve countries is refused
**ID**: SCN-TRANSIT-COUNTRIES-005-C
- **GIVEN** a submission carrying more than twelve transited countries, however it arrived
- **WHEN** the page responds
- **THEN** an error names the limit of twelve, linking to and focusing the search field

### Requirement: The browser title names the page as Transit countries
**ID**: REQ-TRANSIT-COUNTRIES-006
The system MUST title the browser tab "Transit countries - Import notification service - GOV.UK", and "Error: Transit countries - Import notification service - GOV.UK" while the page shows an error.

#### Scenario: The browser title is Transit countries when the page loads
**ID**: SCN-TRANSIT-COUNTRIES-006-A
- **GIVEN** the user opens the transited countries page
- **WHEN** the page loads
- **THEN** the browser title is "Transit countries - Import notification service - GOV.UK"

#### Scenario: The browser title starts with Error when the page shows an error
**ID**: SCN-TRANSIT-COUNTRIES-006-B
- **GIVEN** the user is on the transited countries page
- **WHEN** they press "Add country" with nothing chosen
- **THEN** the browser title is "Error: Transit countries - Import notification service - GOV.UK"

### Requirement: The back link returns to where the user came from
**ID**: REQ-TRANSIT-COUNTRIES-007
The system MUST return the user, when they follow the back link from the transited countries page, to the page they saved and continued from, to Overview when they opened it from its Overview task, and to the review when they opened it from a Change link on the review, as `live-animals/journey-flow` describes. That page is Arrival details.

#### Scenario: After Save and continue, the back link opens the page before
**ID**: SCN-TRANSIT-COUNTRIES-007-A
- **GIVEN** the user reached the transited countries page by saving and continuing from Arrival details
- **WHEN** they follow the back link
- **THEN** that page is shown

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-TRANSIT-COUNTRIES-007-B
- **GIVEN** the user opened the transited countries page from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The back link opens the review when the page was opened from a Change link
**ID**: SCN-TRANSIT-COUNTRIES-007-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link that opens the transited countries page and then the back link
- **THEN** the review is shown

### Requirement: The page shows Overview only when the means of transport is air or sea, or none is saved
**ID**: REQ-TRANSIT-COUNTRIES-008
The system MUST show Overview when the transited countries page is opened and the saved means of transport is Air or Sea, or none is saved. The system MUST show the page when the saved means of transport is Rail or Road, whatever else is saved. The system MUST save no countries and show Overview when the page is submitted with Air, Sea or no means saved.

#### Scenario: Opening the page with air, sea or no means saved shows Overview
**ID**: SCN-TRANSIT-COUNTRIES-008-A
- **GIVEN** the saved means of transport is Air or Sea, or none is saved
- **WHEN** the user opens the transited countries page
- **THEN** Overview is shown

#### Scenario: Submitting the page after the means became air shows Overview and saves no countries
**ID**: SCN-TRANSIT-COUNTRIES-008-B
- **GIVEN** the transited countries page is open and the means of transport has since been saved as Air
- **WHEN** the user submits the page with Add country, Remove, Save and continue or Save and return to overview
- **THEN** Overview is shown
- **AND** no transited countries are saved

#### Scenario: Opening or submitting the page by rail or road with only the means saved shows the page
**ID**: SCN-TRANSIT-COUNTRIES-008-C
- **GIVEN** the saved means of transport is Rail or Road
- **AND** no country of origin or commodity is saved
- **WHEN** the user opens the transited countries page
- **THEN** the page is shown
- **WHEN** the user saves and continues
- **THEN** the transporter list is shown

### Requirement: The search offers the origin countries and their territories, each territory named with its country
**ID**: REQ-TRANSIT-COUNTRIES-009
The system MUST offer in the transited country search the same countries and territories the country of origin page offers, one fixed list the reference data service serves, in alphabetical order, naming each territory "<territory> (<country>)" with its country's served name, with or without JavaScript.

#### Scenario: The search offers the origin countries and their territories in alphabetical order
**ID**: SCN-TRANSIT-COUNTRIES-009-A
- **GIVEN** the user is on the transited countries page
- **WHEN** the search list is read in full
- **THEN** it holds exactly the countries and territories the country of origin page offers, by name, in alphabetical order

#### Scenario: Each territory is named with its country, with or without JavaScript
**ID**: SCN-TRANSIT-COUNTRIES-009-B
- **GIVEN** the transited countries search, with or without JavaScript
- **WHEN** a territory is read
- **THEN** it reads "<territory> (<country>)", for example "Canary Islands (Spain)"

### Requirement: An added territory is listed, saved and listed again under its country-named label
**ID**: REQ-TRANSIT-COUNTRIES-010
The system MUST list an added territory as "<territory> (<country>)", MUST save its code when the user saves and continues, and MUST list it again under the same name when the page is reopened.

#### Scenario: A territory is listed, saved and shown again under the same name
**ID**: SCN-TRANSIT-COUNTRIES-010-A
- **GIVEN** the user is on the transited countries page
- **WHEN** they add a territory and save and continue
- **THEN** no error is shown
- **AND** when they reopen the page the territory is listed as "<territory> (<country>)"

### Requirement: The country search is labelled, and its empty box and no-JavaScript list carry their own wording
**ID**: REQ-TRANSIT-COUNTRIES-011
The system MUST label the transited country search "Enter a country" in the medium label size, MUST show "Search for a country" in the empty search box with JavaScript, and MUST open the list on "Select a country" without JavaScript.

#### Scenario: With JavaScript the empty search box reads "Search for a country"
**ID**: SCN-TRANSIT-COUNTRIES-011-A
- **GIVEN** the user is on the transited countries page with JavaScript on
- **WHEN** the search box is empty
- **THEN** it is labelled "Enter a country" and reads "Search for a country"

#### Scenario: Without JavaScript the list's first entry reads "Select a country"
**ID**: SCN-TRANSIT-COUNTRIES-011-B
- **GIVEN** the user is on the transited countries page with JavaScript off
- **WHEN** the country list is read in full
- **THEN** its first entry reads "Select a country", followed by the countries the search offers

#### Scenario: The "Enter a country" label is medium-size
**ID**: SCN-TRANSIT-COUNTRIES-011-C
- **GIVEN** the user is on the transited countries page
- **WHEN** the country search label is read
- **THEN** it reads "Enter a country" in the medium label size

### Requirement: Each added country's Remove button sits at the right-hand end of its row
**ID**: REQ-TRANSIT-COUNTRIES-012
The system MUST draw the Remove button of every added country in the last cell of its row, aligned to the right-hand end of the row.

#### Scenario: Remove is at the right-hand end of each row
**ID**: SCN-TRANSIT-COUNTRIES-012-A
- **GIVEN** the user has added two countries
- **WHEN** the list is read
- **THEN** each row ends with its Remove button in a right-aligned cell

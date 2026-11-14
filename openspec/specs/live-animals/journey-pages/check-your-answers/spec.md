# Check Your Answers Page Specification

## Purpose

**Maturity**: detailing

**Page**: notification-view

The page on which a whole notification is read back before submission, and read again once submitted. The page is titled "Review your notification".

## Requirements

### Requirement: The review draws six numbered sections, in order, whatever the notification holds, with each card directly under its section heading
**ID**: REQ-CYA-001
The system MUST group the page under six numbered section headings, in order, however little the notification holds, and MUST stand every card directly under its section heading with no subsection heading between, titled one heading level below it. Which cards stand MAY depend on the notification, but no numbered section MUST be dropped.

#### Scenario: The review draws all six numbered sections in order
**ID**: SCN-CYA-001-A
- **GIVEN** the user has just started a notification and answered nothing beyond the entry page
- **WHEN** they view the review
- **THEN** the numbered section headings read "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Uploaded documents", "5. Consignment addresses" and "6. Contact address", in that order

#### Scenario: Every card is titled one heading level below its numbered section, with no subsection heading between
**ID**: SCN-CYA-001-B
- **GIVEN** the user is viewing the review for a notification with commodities entered
- **WHEN** they read down the page
- **THEN** every card's title is a heading one level below its numbered section heading
- **AND** no subsection heading stands above a card, none of "Where is this consignment coming from?", "Commodity details", "Upload documents", "Roles and addresses" or "Contact address for this consignment"
- **AND** "1. About the consignment" holds the cards "Origin of import", "What are you importing?" and "Main import reason", in that order

#### Scenario: The Uploaded documents section stands even when nothing has been uploaded
**ID**: SCN-CYA-001-E
- **GIVEN** a notification with no documents uploaded
- **WHEN** the user views the review
- **THEN** the Uploaded documents section and its card are still shown, saying no documents have been added yet
- **AND** a Change route to the upload documents page is still offered

#### Scenario: A fully answered notification's check-your-answers reflects every entered value
**ID**: SCN-CYA-001-C
- **GIVEN** the user has answered every section of a notification except documents
- **WHEN** they view check-your-answers
- **THEN** each section shows cards of the entered values — for example the country of origin, the species and animal details entered, and the arrival details entered

#### Scenario: Check-your-answers lists every address role with its selected party
**ID**: SCN-CYA-001-D
- **GIVEN** the user has selected a party for each of the notification's address roles — place of origin, consignor, consignee, importer, and place of destination
- **WHEN** they view check-your-answers
- **THEN** the Addresses card, the one card under "5. Consignment addresses", lists all of them, each showing the selected party's name and country
- **AND** its one header Change link opens the roles and addresses page

#### Scenario: The reason, additional details and contact address answers stand on their own titled cards
**ID**: SCN-CYA-001-H
- **GIVEN** the user has answered the reason for import, the additional details and the contact address
- **AND** the additional details page is part of the notification's journey
- **WHEN** they view the review
- **THEN** the reason answers stand on the card titled "Main import reason", its first row keyed "Main import reason"
- **AND** the additional details answers stand on the card titled "Additional details", whose Change link opens the additional details page
- **AND** "6. Contact address" holds one card titled "Contact address", with a "Contact address" row

#### Scenario: The arrival details card names the means of transport as the arrival page offers it
**ID**: SCN-CYA-001-G
- **GIVEN** a notification whose means of transport is road
- **WHEN** the user views the review
- **THEN** the "Means of transport to the port of entry" row reads "Road"
- **AND** an air arrival reads "Air"

### Requirement: A blank is written out as "Not applicable" on a settled card and left blank on one still outstanding
**ID**: REQ-CYA-002
On a notification's review, the system MUST draw a blank by the card it sits in: "Not applicable" on a card with nothing further owed; visibly blank, with "Missing" announced for a screen reader, on a card still holding outstanding answers. It MUST treat every blank row in a marked card alike, optional or not, and MUST NOT raise a role error against a party role nobody has reached yet; REQ-ADDR-005 reserves that error for a copied address that breaks the address book's rules.

#### Scenario: A blank row is written out on a settled card and left blank on an outstanding one
**ID**: SCN-CYA-002-A
- **GIVEN** the user has answered only the entry page of a notification
- **WHEN** they view the review
- **THEN** a blank row on a card with nothing further owed reads "Not applicable"
- **AND** a blank row on a card still holding outstanding answers is visibly blank, with "Missing" announced in its place for a screen reader
- **AND** every blank row in that marked card is left blank in the same way, the optional ones included

#### Scenario: An unanswered party role is left blank, with no role error shown
**ID**: SCN-CYA-002-B
- **GIVEN** a new notification whose party roles have not yet been answered
- **WHEN** the user views the review
- **THEN** each unanswered role is left visibly blank with "Missing" announced for a screen reader, and no role error is raised against it

#### Scenario: A refused Continue leaves an unfinished card's blank answers blank, marked only by the card
**ID**: SCN-CYA-002-C
- **GIVEN** the user has answered only the entry page of a notification
- **WHEN** they choose Continue on the review and it is refused
- **THEN** each blank answer in an unfinished card is left blank with "Missing" announced for a screen reader, with no mark beside or under it
- **AND** the only visible marking on that card is its red left border and its "Complete" line, at desktop width and at phone width

### Requirement: A review's back link goes to the place the user came from, and a submitted notification's view goes to the dashboard
**ID**: REQ-CYA-003
The system MUST return the user from the back link of a draft or amendment review to the page they saved and continued from, to Overview when they opened it from Overview or by its address, and to the dashboard when they opened it from a dashboard card. A Change link, an error-summary link or a refused Continue MUST leave that back link as it was. A submitted notification's view MUST go back to the dashboard.

#### Scenario: The review's back link opens the contact address after Save and continue there
**ID**: SCN-CYA-003-A
- **GIVEN** the user selected "Save and continue" on the contact address page and reached the review
- **WHEN** they follow the back link
- **THEN** the contact address page is shown

#### Scenario: The submitted view's back link opens the dashboard
**ID**: SCN-CYA-003-B
- **GIVEN** the user is on a submitted notification's view
- **WHEN** they follow the back link
- **THEN** the dashboard is shown

#### Scenario: A review opened from Overview has a back link to Overview
**ID**: SCN-CYA-003-C
- **GIVEN** the user opened the review with the Review and submit button on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The submitted view shown after an amendment is cancelled has a back link to the dashboard
**ID**: SCN-CYA-003-D
- **GIVEN** the user has just cancelled an amendment and the submitted notification's view is shown with its cancelled message
- **WHEN** they follow the back link
- **THEN** the dashboard is shown

#### Scenario: A review opened from a dashboard card has a back link to the dashboard
**ID**: SCN-CYA-003-E
- **GIVEN** the user opened the review by View, or by Amend, on a notification's dashboard card
- **WHEN** they follow the back link
- **THEN** the dashboard is shown

#### Scenario: A Change link round trip leaves the review's back link as it was
**ID**: SCN-CYA-003-F
- **GIVEN** the review opened from a dashboard card
- **WHEN** the user follows a Change link, follows the back link on the page it opens, and then follows the back link on the review
- **THEN** the dashboard is shown

#### Scenario: A review with nothing saying where the user came from has a back link to Overview
**ID**: SCN-CYA-003-G
- **GIVEN** the review of a draft notification or of an amendment, opened by its address
- **WHEN** the user follows the back link
- **THEN** Overview is shown

### Requirement: A Change link opens the page that collects the answer, and Save and continue goes on through the journey to check your answers
**ID**: REQ-CYA-004
The system MUST open the page that collects an answer when the user follows its Change link, and Save and continue on it MUST go on through the journey to the next page that applies and, past the last, to check-your-answers, showing the new value. This holds on a draft and while the notification is being amended.

#### Scenario: Editing an answer via Change and saving and continuing through the journey shows the new value on check-your-answers
**ID**: SCN-CYA-004-A
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow a Change link, edit the answer, and save and continue on each page that follows
- **THEN** they arrive at check-your-answers, showing the new value

#### Scenario: Changing the contact address from its card opens the contact address page, and Save and continue opens the review
**ID**: SCN-CYA-004-B
- **GIVEN** the user is on the review of a draft
- **WHEN** they follow the Contact address card's Change link, choose a contact address and save and continue
- **THEN** the contact address page opens, and after saving the review is shown with that address

#### Scenario: Changing documents from a document card opens upload documents, and Save and continue goes on through the journey to the review
**ID**: SCN-CYA-004-C
- **GIVEN** a notification with a document uploaded
- **WHEN** the user follows a document card's Change link and continues from the upload documents page
- **THEN** they go on through the journey to the review

### Requirement: A draft notification offers submission and none of the post-submission actions
**ID**: REQ-CYA-005
The system MUST invite the user to submit a draft notification, offering a continue action, and MUST NOT offer copy-as-new, delete, or cancel-amendment while it is still a draft.

#### Scenario: The draft view invites submission and withholds the post-submission actions
**ID**: SCN-CYA-005-A
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** it invites them to submit the notification, offering a continue action
- **AND** no copy-as-new, delete, or cancel-amendment action is offered

### Requirement: Continuing from a ready draft notification moves on to the declaration
**ID**: REQ-CYA-006
The system MUST take the user from a draft notification's check-your-answers to the declaration page when they continue, once every task is ready to submit.

#### Scenario: Continuing opens the declaration
**ID**: SCN-CYA-006-A
- **GIVEN** a draft notification is open on check-your-answers, with every task ready
- **WHEN** the user continues
- **THEN** the declaration page opens

#### Scenario: Transit countries are not owed for submission
**ID**: SCN-CYA-006-B
- **GIVEN** a draft arriving by road or rail with every task ready and no transit countries added
- **WHEN** the user views the review and continues
- **THEN** no "Complete transit countries" message or transit error is shown
- **AND** the declaration page opens

### Requirement: A draft notification that is not yet ready is refused on the review page, named card by card
**ID**: REQ-CYA-007
The system MUST refuse to continue from the review of a draft while any card still holds outstanding answers, MUST keep the user on the review page, and MUST show an error summary titled "There is a problem" naming every unfinished card and every species short of a count or an identifier, linking each entry to where the answer is shown: the card, or that species' block. The summary MUST stand as soon as the page is opened, and MUST take focus after a refused attempt.

#### Scenario: An unfinished review names every outstanding card and links to it
**ID**: SCN-CYA-007-A
- **GIVEN** a new notification is open on the review with cards still outstanding
- **WHEN** the user views the page
- **THEN** an error summary titled "There is a problem" names every unfinished card
- **AND** each entry for a card links to the card it names, which is itself marked with the same words

#### Scenario: Continuing from an unfinished review is refused, keeping the user on the page
**ID**: SCN-CYA-007-B
- **GIVEN** a new notification is open on the review with cards still outstanding
- **WHEN** the user continues
- **THEN** they remain on the review page, the error summary is shown, and focus moves to it

#### Scenario: A new notification's unfinished messages name the origin, reason and additional details cards in their titles' words
**ID**: SCN-CYA-007-C
- **GIVEN** a new notification is open on the review with nothing answered beyond the entry page
- **WHEN** the user views the page
- **THEN** the unfinished messages, in the error summary and on the card, read "Complete origin of import", "Complete main import reason" and "Complete additional details"

#### Scenario: With no commodity selected the What are you importing? card is marked unfinished
**ID**: SCN-CYA-007-D
- **GIVEN** a new notification with no commodity selected
- **WHEN** the user views the review
- **THEN** the "What are you importing?" card is marked "Complete what are you importing?"
- **AND** the error summary entry with those words links to that card

#### Scenario: Incomplete consignment details name commodity details and link to the first commodity card
**ID**: SCN-CYA-007-E
- **GIVEN** a notification with a commodity selected and its consignment details incomplete
- **WHEN** the user views the review
- **THEN** the error summary reads "Complete commodity details" and links to the first commodity card
- **AND** no commodity card is marked as unfinished

#### Scenario: A species with no count is named and linked to its block
**ID**: SCN-CYA-007-F
- **GIVEN** a notification with two species selected under identified commodities, one with no number of animals
- **WHEN** the user views the review
- **THEN** the error summary reads "Enter the number of animals for <species>", the species name in lower case
- **AND** the entry links to that species' block, which shows no message of its own

#### Scenario: A species with a count and no identifier is named and linked to its block
**ID**: SCN-CYA-007-G
- **GIVEN** a notification with two species selected under identified commodities, each with a count and no animal identified
- **WHEN** the user views the review
- **THEN** the error summary reads "Enter at least 1 animal identifier for <species>" for each, the species name in lower case
- **AND** each entry links to that species' block
- **AND** following the entry for bos taurus moves focus to that species' block, whose heading reads "Bos Taurus"

#### Scenario: A single identified species with no identifier is not named
**ID**: SCN-CYA-007-H
- **GIVEN** a notification with one species selected under an identified commodity, with a count and no animal identified
- **WHEN** the user views the review
- **THEN** the error summary names no species

### Requirement: A submitted notification offers copy-as-new and delete
**ID**: REQ-CYA-008
The system MUST offer copy-as-new and delete actions on the read-only view of a submitted notification, and MUST NOT offer cancel-amendment while no amendment is in progress, or a submit/continue action to submit it again.

#### Scenario: The submitted view offers the actions open to a submitted notification
**ID**: SCN-CYA-008-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** copy-as-new and delete actions are offered, and no cancel-amendment action is shown
- **AND** no submit or continue action is shown

#### Scenario: Delete opens the delete confirmation
**ID**: SCN-CYA-008-C
- **GIVEN** a submitted notification's view
- **WHEN** the user chooses "Delete"
- **THEN** the delete confirmation opens

### Requirement: Copying a submitted notification from this page opens a new draft under its own reference
**ID**: REQ-CYA-009
The system MUST open a new draft when the user copies a submitted notification from check-your-answers, carrying a newly minted reference number distinct from the original's.

#### Scenario: Copy as new opens a distinct new draft
**ID**: SCN-CYA-009-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user copies it as new
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's

### Requirement: The review marks the uploaded-documents card while a document is still being scanned or was found infected, and refuses to continue while it is
**ID**: REQ-CYA-010
The system MUST mark the uploaded-documents card on a draft's review while any stored document is still being scanned or has been found infected — putting the infected message ahead of the still-scanning one — and MUST refuse to continue from the review while either is so, returning the user to the review with that error shown.

#### Scenario: Continuing while a document is still being scanned is refused, marking the uploaded-documents card on the review
**ID**: SCN-CYA-010-A
- **GIVEN** a ready draft notification is open on the review, and one of its documents is still being scanned
- **WHEN** the user continues
- **THEN** they are returned to the review, which marks the uploaded-documents card as still being scanned

#### Scenario: An infected document marks the uploaded-documents card in preference to one still scanning
**ID**: SCN-CYA-010-B
- **GIVEN** a ready draft notification is open on the review, and one of its documents has been found infected while another is still being scanned
- **WHEN** the user continues
- **THEN** they are returned to the review, which marks the uploaded-documents card as holding an infected document, not as still being scanned

### Requirement: Continuing is refused if the notification has changed since the review was shown
**ID**: REQ-CYA-011
The system MUST refuse to continue from the review to the declaration if the notification has changed since that review was shown — in another tab or by another user — and MUST return the user to the review showing the notification as it now stands, under a message that it has been updated since they opened it.

#### Scenario: A change made in another tab after the review was shown sends the user back to the review
**ID**: SCN-CYA-011-A
- **GIVEN** a ready draft notification is open on the review
- **AND** the notification is then changed in another tab
- **WHEN** the user continues from the review they already have open
- **THEN** the review is shown again with the changed answer, under a message that the notification has been updated since they opened it
- **AND** the declaration is not shown

### Requirement: An amendment that is not yet ready opens without an error and refuses Continue with one
**ID**: REQ-CYA-012
While a notification is being amended, the system MUST show the review with no error summary and no error message when it is opened, and MUST refuse Continue while any answer is incomplete or breaks its rules, keeping the user on the review, still amending and without opening the declaration, under an error summary titled "There is a problem" that names each reason and takes focus, as a draft's refused Continue does.

#### Scenario: An incomplete amendment's review opens with no error
**ID**: SCN-CYA-012-A
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user opens the review
- **THEN** no error summary and no error message is shown

#### Scenario: Continuing from an incomplete amendment stays on the review, naming what is missing
**ID**: SCN-CYA-012-B
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user continues
- **THEN** they stay on the review, under an error summary titled "There is a problem" that names the arrival details and takes focus
- **AND** the notification is still being amended
- **AND** the declaration is not opened

#### Scenario: Continuing from an amendment whose arrival date breaks its rule stays on the review, naming it
**ID**: SCN-CYA-012-C
- **GIVEN** a notification being amended whose arrival date at port has been changed to more than 6 months ahead
- **WHEN** the user continues on the review
- **THEN** they stay on the review, under an error summary that names the arrival details
- **AND** the notification is still being amended
- **AND** the declaration is not opened

### Requirement: Ports, destination and transited countries and document types read back exactly as they were offered
**ID**: REQ-CYA-013
The system MUST show the port of entry, and the "Exit border control post" of a transit or the "Port of exit" of a temporary admission, on the review exactly as the port was offered when it was chosen, reading "<port name> - <port code>". It MUST name a territory chosen as the destination country, or among the transited countries, "<territory> (<country>)", as the lists offered it, and MUST name each document's type with the wording the upload documents page offered.

#### Scenario: The exit border control post row reads the option the user chose
**ID**: SCN-CYA-013-A
- **GIVEN** a transit notification whose exit border control post is Port of Dover
- **WHEN** the user views the review
- **THEN** the "Exit border control post" row reads "Port of Dover - GB DVR", the same text as the option they chose

#### Scenario: The port of entry row reads the port's name, a dash and its code
**ID**: SCN-CYA-013-B
- **GIVEN** a notification whose port of entry is Aberdeen Harbour
- **WHEN** the user views the review
- **THEN** the port of entry row reads "Aberdeen Harbour - GB ABD"

#### Scenario: A territory destination country is named with its country
**ID**: SCN-CYA-013-C
- **GIVEN** a transhipment notification whose destination country is Martinique
- **WHEN** the user views the review
- **THEN** the destination country row reads "Martinique (France)"

#### Scenario: A document's type row reads the option the user chose
**ID**: SCN-CYA-013-D
- **GIVEN** a notification holding a document whose type was chosen as "CITES permit/certificate"
- **WHEN** the user views the review
- **THEN** that document's type row reads "CITES permit/certificate", the same text as the option they chose

#### Scenario: A transited territory is named with its country
**ID**: SCN-CYA-013-E
- **GIVEN** a road notification transiting the Canary Islands and France
- **WHEN** the user views the review
- **THEN** the transited countries row reads "Canary Islands (Spain), France"

### Requirement: Continuing a draft is refused while it holds a species the reference data no longer lists
**ID**: REQ-CYA-014
The system MUST check a draft's chosen species against the commodity reference data when the user continues from the review, MUST refuse to continue while any chosen species is no longer listed under its commodity code — removed or renamed — naming each such species and its code, and MUST NOT make this check on a plain view of the review or on an amendment.

#### Scenario: A draft holding a species no longer listed is refused, naming it
**ID**: SCN-CYA-014-A
- **GIVEN** a complete draft holding a species the reference data no longer lists under its code
- **WHEN** the user continues from the review
- **THEN** the review is shown again with an error summary naming that species and its code, telling the user to select a species from the list
- **AND** the entry links to the "What are you importing?" card

#### Scenario: The species is not named before the user continues
**ID**: SCN-CYA-014-B
- **GIVEN** a complete draft holding a species the reference data no longer lists under its code
- **WHEN** the user views the review
- **THEN** no error summary is shown

#### Scenario: An amendment continues to the declaration without a species check
**ID**: SCN-CYA-014-C
- **GIVEN** an amendment holding a species the reference data no longer lists under its code
- **WHEN** the user continues from the review
- **THEN** the user moves on to the declaration
- **AND** that species is not named as one to choose again

### Requirement: The Transport details card always shows its five rows, with a private transporter's saved country
**ID**: REQ-CYA-015
The system MUST always show the Name, Address, Country, Approval number and Type rows on the Transport details card, writing an empty answer as "Not applicable", and MUST show a transporter's saved country on the Country row, private or commercial.

#### Scenario: A private transporter's saved country shows on the review
**ID**: SCN-CYA-015-A
- **GIVEN** a private transporter has been saved with a country from the offered list
- **WHEN** the user views the review
- **THEN** the Transport details card's Country row shows that country

#### Scenario: A transporter with no approval number reads Not applicable
**ID**: SCN-CYA-015-B
- **GIVEN** a private transporter has been saved with no approval number
- **WHEN** the user views the review
- **THEN** the Transport details card's Approval number row reads "Not applicable"
- **AND** its Name, Address, Country and Type rows are still shown

#### Scenario: A commercial transporter's five rows read its saved values
**ID**: SCN-CYA-015-C
- **GIVEN** a commercial transporter has been chosen
- **WHEN** the user views the review
- **THEN** the Transport details card reads the transporter's name, address, country and approval number on the Name, Address, Country and Approval number rows
- **AND** its Type row reads "Commercial"

### Requirement: The review shows only the exit answers the main import reason asked for
**ID**: REQ-CYA-016
The system MUST show the exit rows on the review only for the import reasons that ask them: "Exit border control post" then "Destination country" for transit, "Exit date" then "Port of exit" for temporary admission horses, and none of them for a reason that asks none of them.

#### Scenario: A transit notification shows its exit border control post then its destination country, and no exit date
**ID**: SCN-CYA-016-A
- **GIVEN** a notification whose main import reason is transit, with an exit border control post and a destination country saved
- **WHEN** the user views the review
- **THEN** the Main import reason card shows the "Exit border control post" row and then the "Destination country" row, each showing what was saved
- **AND** no Port of exit or Exit date row is shown

#### Scenario: A temporary admission shows its exit date and port of exit, and no destination country
**ID**: SCN-CYA-016-B
- **GIVEN** a notification whose main import reason is temporary admission horses, with an exit date and a port of exit saved
- **WHEN** the user views the review
- **THEN** the Exit date and Port of exit rows show what was saved
- **AND** no Destination country row is shown

#### Scenario: A reason that asks none of the exit answers shows none of their rows
**ID**: SCN-CYA-016-C
- **GIVEN** a notification whose main import reason is re-entry
- **WHEN** the user views the review
- **THEN** no Destination country, Exit date, Port of exit or Exit border control post row is shown

### Requirement: A species block's Identification details table heads only the identifiers asked of that line's species
**ID**: REQ-CYA-017
The system MUST head a species block's identifier table "Identification details", with an Animal column and a column for each identifier asked of that line's species that some saved animal on the line filled in, and one row per saved animal labelled with the species name and the animal's number. On an editable review the table MUST have its own Change link to the animal identification page.

#### Scenario: The identifier table heads only the columns a line's species was asked for and some animal filled in
**ID**: SCN-CYA-017-A
- **GIVEN** a line of a species asked for a microchip, a passport and a horse name, with all three filled in for its one saved animal
- **WHEN** the user views that species' block on the review
- **THEN** its table, headed "Identification details", has columns Animal, Microchip, Passport and Horse name, with that animal's values in its one row
- **AND** a species under the same commodity code that is not asked for the horse name never heads a Horse name column in its own block

#### Scenario: Each animal's row is labelled with its species name and number
**ID**: SCN-CYA-017-B
- **GIVEN** a cat line of two saved animals
- **WHEN** the user views the cat's block on the review
- **THEN** the first cells of the table's rows read "Felis catus 1" and "Felis catus 2"

#### Scenario: Identification details has its own Change link on an editable review
**ID**: SCN-CYA-017-C
- **GIVEN** a draft with a saved animal on a species
- **WHEN** the user views the review
- **THEN** the species block's Identification details has a Change link opening the animal identification page
- **AND** a submitted notification's Identification details has none

### Requirement: The Addresses card lists one row per animal that has a saved permanent address
**ID**: REQ-CYA-020
The system MUST list on the Addresses card, after the county parish holding row, one row for each animal that has a saved permanent address, keyed by that animal's species common name and number and holding that animal's saved address as a party row reads it. An animal that needs a permanent address and has none MUST have no row, and a line that needs one with no animal counted MUST have none either.

#### Scenario: The Addresses card lists a row for each animal that has a saved permanent address
**ID**: SCN-CYA-020-A
- **GIVEN** a cat line of two animals, one saved against the place of destination and one with a hand-entered address
- **WHEN** the user views check-your-answers
- **THEN** the Addresses card lists, after the party rows, a row for each animal keyed by its species' common name and number, each holding that animal's saved address

#### Scenario: An animal that still owes a permanent address has no row, while commodity details are still reported outstanding
**ID**: SCN-CYA-020-B
- **GIVEN** a cat line of two animals, with a permanent address saved for only one of them
- **WHEN** the user views check-your-answers
- **THEN** the Addresses card lists a row for the answered animal alone
- **AND** the error summary still names commodity details as needing to be completed

#### Scenario: A line needing a permanent address with no animal counted has no permanent address row
**ID**: SCN-CYA-020-C
- **GIVEN** a cat line that needs a permanent address, with its animal count given and no animal identified
- **WHEN** the user views check-your-answers
- **THEN** the Addresses card lists no permanent address row

### Requirement: The Origin of import card always shows its three rows
**ID**: REQ-CYA-021
The system MUST show the Country of origin, Region of origin code and Internal reference number rows on the Origin of import card, in that order, whether or not a region of origin code was needed, and MUST NOT show a "Region of origin code required" row.

#### Scenario: A given region of origin code reads on its row
**ID**: SCN-CYA-021-A
- **GIVEN** a notification whose origin needs a region of origin code and has one saved
- **WHEN** the user views the review
- **THEN** the Origin of import card's rows are keyed "Country of origin", "Region of origin code" and "Internal reference number", in that order
- **AND** the "Region of origin code" row reads the saved code

#### Scenario: A region of origin code that is not needed reads Not applicable
**ID**: SCN-CYA-021-B
- **GIVEN** a notification whose origin needs no region of origin code
- **WHEN** the user views the review
- **THEN** the Origin of import card's "Region of origin code" row reads "Not applicable"

### Requirement: The Arrival details card dates the arrival at the destination and reads the transit countries inside it
**ID**: REQ-CYA-022
The system MUST key the arrival date row on the Arrival details card "Arrival date at destination". When transit countries apply, it MUST read them in that card under a "Transit countries" subsection, on a row keyed "Countries that the consignment will travel through", comma-separated in the order added, with its own Change link and no separate Transit countries card. A submitted notification's row MUST carry no Change link.

#### Scenario: The arrival date row is keyed at the destination
**ID**: SCN-CYA-022-A
- **GIVEN** a notification with an arrival date
- **WHEN** the user views the review
- **THEN** the Arrival details card reads the date on a row keyed "Arrival date at destination"

#### Scenario: A road notification reads its transit countries inside the Arrival details card
**ID**: SCN-CYA-022-B
- **GIVEN** a notification arriving by road, with France and Belgium added as transit countries
- **WHEN** the user views the review
- **THEN** the Arrival details card holds a "Transit countries" subsection
- **AND** its "Countries that the consignment will travel through" row reads "France, Belgium"
- **AND** that row's Change link opens the transit countries page
- **AND** no card titled "Transit countries" is shown

#### Scenario: An air notification has no transit countries subsection
**ID**: SCN-CYA-022-C
- **GIVEN** a notification arriving by air
- **WHEN** the user views the review
- **THEN** the Arrival details card holds no "Transit countries" subsection

#### Scenario: A submitted notification's transit countries row has no Change link
**ID**: SCN-CYA-022-D
- **GIVEN** a submitted notification arriving by road, with France and Belgium added as transit countries
- **WHEN** the user views it
- **THEN** the "Countries that the consignment will travel through" row reads "France, Belgium"
- **AND** that row has no Change link

### Requirement: The What are you importing? card reads the commodity selection back once, with each species named in capitals
**ID**: REQ-CYA-023
The system MUST show a card titled "What are you importing?" between "Origin of import" and "Main import reason" in "1. About the consignment", with rows "Commodity code", "Common name" and "Species" and a Change link to the commodity selection page. It MUST list each selected commodity's code once, and each selected species' common name and Latin name, comma-separated, with every word of a Latin name capitalised. Under "other live mammals" it MUST add each species' own code.

#### Scenario: The card reads the selection back in three rows with a Change link
**ID**: SCN-CYA-023-A
- **GIVEN** a notification with Bos taurus selected under commodity code 0102
- **WHEN** the user views the review
- **THEN** the "What are you importing?" card has rows "Commodity code", "Common name" and "Species", reading "0102", "Domestic Cattle" and "Bos Taurus"
- **AND** its Change link opens the commodity selection page

#### Scenario: Two species of one commodity share one code
**ID**: SCN-CYA-023-B
- **GIVEN** a notification with Bos taurus and Bison bison selected under commodity code 0102
- **WHEN** the user views the review
- **THEN** the "Commodity code" row reads "0102" once
- **AND** the "Common name" row reads "Domestic Cattle, American Bison" and the "Species" row reads "Bos Taurus, Bison Bison"

#### Scenario: Each species under other live mammals adds its own code and common name
**ID**: SCN-CYA-023-C
- **GIVEN** a notification with Felis catus and Mustela putorius furo selected under other live mammals
- **WHEN** the user views the review
- **THEN** the "Commodity code" row reads "01061900, 01061900"
- **AND** the "Common name" row reads "Domestic Cat, Ferret"
- **AND** the "Species" row reads "Felis Catus, Mustela Putorius Furo"

#### Scenario: A submitted notification's card has no Change link
**ID**: SCN-CYA-023-D
- **GIVEN** a submitted notification
- **WHEN** the user views it
- **THEN** the "What are you importing?" card has no Change link

### Requirement: "2. Description of the goods" holds one card per commodity with one block per species
**ID**: REQ-CYA-024
The system MUST show one card per selected commodity in "2. Description of the goods", titled by the commodity's code, holding one block per species headed with its Latin name, every word capitalised. A block MUST show the species' counts and no "Commodity code", "Common name" or "Species" row. On an editable review the card and the first row of each block MUST each carry a Change link to the consignment details page.

#### Scenario: Two species of one commodity stand as two blocks in one card
**ID**: SCN-CYA-024-A
- **GIVEN** a notification with Bos taurus and Bison bison selected under commodity code 0102
- **WHEN** the user views the review
- **THEN** "2. Description of the goods" holds one card titled "0102"
- **AND** the card holds a block headed "Bos Taurus" and a block headed "Bison Bison"

#### Scenario: A block shows its counts and no commodity or species rows
**ID**: SCN-CYA-024-B
- **GIVEN** a notification with 25 Bos taurus and 5 packages
- **WHEN** the user views the review
- **THEN** the "Bos Taurus" block shows "Number of animals" reading "25" and then "Number of packages (when required)" reading "5"
- **AND** it shows no "Commodity code", "Common name" or "Species" row

#### Scenario: A blank package count reads Not applicable and a species with no packaging shows no package row
**ID**: SCN-CYA-024-C
- **GIVEN** a notification with Bos taurus counted and no package count given, and an ostrich counted
- **WHEN** the user views the review
- **THEN** the "Bos Taurus" block's "Number of packages (when required)" row reads "Not applicable"
- **AND** the ostrich block shows "Number of animals" alone

#### Scenario: The card and the first row of each block carry their own Change links to consignment details
**ID**: SCN-CYA-024-D
- **GIVEN** a draft notification with a species counted
- **WHEN** the user views the review
- **THEN** the commodity card's heading has a Change link opening the consignment details page
- **AND** the first row of the species block has its own Change link opening the same page

#### Scenario: A submitted notification's commodity cards and blocks have no Change links
**ID**: SCN-CYA-024-E
- **GIVEN** a submitted notification
- **WHEN** the user views it
- **THEN** the commodity card and its species blocks have no Change link

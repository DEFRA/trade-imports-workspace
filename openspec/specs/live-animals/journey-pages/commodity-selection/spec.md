# Commodity Selection Page Specification

## Purpose

Asks which commodities and species the consignment contains, found by searching rather than browsing, keeping a running tally of what has been chosen. The page is titled "What are you importing?".

## Requirements

### Requirement: The page asks what is being imported and holds nothing until it is searched
**ID**: REQ-COMMODITY-SELECT-001
The system MUST ask the user what they are importing, offering a search box and a save-and-continue action, and MUST list no species and show no selection tally until a search has been made.

#### Scenario: The page opens empty, with only a search box
**ID**: SCN-COMMODITY-SELECT-001-A
- **GIVEN** the user has reached the commodity selection page without choosing anything before
- **WHEN** the page loads
- **THEN** it asks what is being imported, offering a search box and a save-and-continue action
- **AND** no species are listed and no selection tally is shown

### Requirement: A search shorter than three characters returns nothing
**ID**: REQ-COMMODITY-SELECT-002
The system MUST list no species for a search of fewer than three characters, so that a partial word does not return the whole book.

#### Scenario: A two-character search lists nothing
**ID**: SCN-COMMODITY-SELECT-002-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for two characters
- **THEN** no species are listed

### Requirement: A search can match a commodity's code or a species' common or Latin name
**ID**: REQ-COMMODITY-SELECT-003
The system MUST search the commodity reference data against a commodity's code and against a species' common name as well as its Latin name, MUST leave out every species under a commodity code the reference data flags as germinal, with no other filter on the code, and MUST offer each species by its label: its Latin name with its common name in round brackets, as the reference data spells both, or its Latin name alone where the reference data holds no common name for it.

#### Scenario: Searching by common name offers each matching species under each live-animal code that lists it, by its Latin name with its common name in brackets
**ID**: SCN-COMMODITY-SELECT-003-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search by a species' common name
- **THEN** each matching species is offered under each live-animal commodity code that lists it, by its Latin name with its common name in round brackets

#### Scenario: A search offers no commodity code the reference data flags as germinal
**ID**: SCN-COMMODITY-SELECT-003-B
- **GIVEN** the reference data lists a species under a live-animal code and under codes it flags as germinal
- **WHEN** the user searches by that species' common name
- **THEN** the species is offered under the live-animal code only

#### Scenario: Searching by commodity code offers the species that search returns under that code, by its Latin name with its common name in brackets
**ID**: SCN-COMMODITY-SELECT-003-C
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a live-animal commodity code whose search lists no more than a hundred species
- **THEN** those species are offered under that code, each by its Latin name with its common name in round brackets

#### Scenario: Searching by a species' Latin name, or one word of it, offers that species under each live-animal code that lists it, by its Latin name with its common name in brackets
**ID**: SCN-COMMODITY-SELECT-003-D
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search by a species' Latin name, or one word of it
- **THEN** that species is offered under each live-animal code that lists it, by its Latin name with its common name in round brackets

#### Scenario: A species the reference data holds no common name for is offered by its Latin name alone
**ID**: SCN-COMMODITY-SELECT-003-E
- **GIVEN** the reference data holds no common name for a species a search matches
- **WHEN** the results are shown
- **THEN** that species is offered by its Latin name alone, with no brackets

### Requirement: Matching species are grouped under the commodity they belong to, one group per matching commodity
**ID**: REQ-COMMODITY-SELECT-004
The system MUST group the species a search matches under a heading of their commodity, reading as the commodity's name with its code in round brackets, or the code alone where no name is known, MUST render a separate group for each commodity code a search matches, and MUST say so plainly when a search matches nothing. A species listed under two codes is two separate choices.

#### Scenario: A search groups its matching species under their commodity heading
**ID**: SCN-COMMODITY-SELECT-004-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term matching species under one commodity code
- **THEN** the matching species are listed together under a heading for that commodity

#### Scenario: A search matching more than one commodity renders a group for each
**ID**: SCN-COMMODITY-SELECT-004-B
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term that matches species under two different commodity codes
- **THEN** two separate groups are shown, each headed by its own commodity

#### Scenario: A search matching nothing says so
**ID**: SCN-COMMODITY-SELECT-004-C
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term that matches no commodity or species
- **THEN** the page says no results were found, and lists no species

#### Scenario: A commodity heading names the commodity with its code in brackets
**ID**: SCN-COMMODITY-SELECT-004-D
- **GIVEN** a search matching species under a commodity whose name is known
- **WHEN** the results are shown
- **THEN** the group's heading reads as the commodity's name with its code in round brackets
- **AND** a group whose commodity has no known name is headed by its code alone

### Requirement: The page explains what a commodity code is and links out to look one up
**ID**: REQ-COMMODITY-SELECT-005
The system MUST offer the user an explanation of what a commodity code is and where to find one, including a link that opens the Trade Tariff tool in a new tab, reading "Trade Tariff tool" with "(opens in a new tab)" on its own line after it, both part of the link's name.

#### Scenario: The commodity-code help explains the code and links to the Trade Tariff tool
**ID**: SCN-COMMODITY-SELECT-005-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they open the commodity-code help
- **THEN** it explains what the code is and offers a link to look one up, which opens the Trade Tariff tool in a new tab
- **AND** the link reads "Trade Tariff tool" with "(opens in a new tab)" on its own line after it, both part of the link's name

### Requirement: Species chosen under different searches are all kept, in a canonical order
**ID**: REQ-COMMODITY-SELECT-006
The system MUST keep every species the user has chosen, whichever search brought it on screen, MUST list them all in the selection tally without any search in place, MUST show each as still chosen when its own search brings it back, and MUST list saved species in a canonical order rather than the order they were chosen in.

#### Scenario: Species found under separate searches are kept together
**ID**: SCN-COMMODITY-SELECT-006-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they choose one species found under one search and another found under a different search, then save and continue
- **THEN** both are saved and no error summary is shown
- **WHEN** they return to the page
- **THEN** the selection tally lists both, and reports two chosen, with no search in place
- **AND** searching for either one again shows it as still chosen

#### Scenario: Saved species are ordered canonically, not by the order they were chosen
**ID**: SCN-COMMODITY-SELECT-006-B
- **GIVEN** the user chooses three species in a search order that does not match their canonical order
- **WHEN** they save, and open commodity details from Overview
- **THEN** the species appear there in their canonical order, not the order chosen

### Requirement: The back link returns to the origin of the import in the opening sequence, to the page that opened it, and to Overview otherwise
**ID**: REQ-COMMODITY-SELECT-007
The system MUST return the user to the origin of the import page when they follow the back link from the commodity selection page during the opening sequence, to commodity details or identification details when that page opened it, and to Overview when the page was opened from its Overview task. On a draft opened from a Change link on the review, the back link MUST open the origin of the import page, as `live-animals/journey-flow` describes.

#### Scenario: On a draft opened from a Change link, the back link opens the origin of the import
**ID**: SCN-COMMODITY-SELECT-007-D
- **GIVEN** a draft notification with what are you importing opened by the back link from the main import reason page that a Change link opened
- **WHEN** the user follows the back link
- **THEN** the origin of the import page is shown

#### Scenario: The back link opens Overview when the page was opened from Overview
**ID**: SCN-COMMODITY-SELECT-007-A
- **GIVEN** the opening sequence has ended and the user opened what are you importing from its task on Overview
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: In the opening sequence, the back link opens origin of the import
**ID**: SCN-COMMODITY-SELECT-007-B
- **GIVEN** the user is in the opening sequence and has saved origin of the import
- **WHEN** they follow the back link from what are you importing
- **THEN** the origin of the import page is shown

#### Scenario: Opened from commodity details, the back link opens commodity details
**ID**: SCN-COMMODITY-SELECT-007-C
- **GIVEN** the user opened what are you importing from the Add another commodity link on commodity details
- **WHEN** they follow the back link
- **THEN** commodity details is shown

### Requirement: The tally lists what has been chosen, offers a remove for each species, and can be cleared
**ID**: REQ-COMMODITY-SELECT-008
The system MUST report how many species have been chosen, showing each chosen commodity as a bold heading of its code alone, followed by one entry per chosen species showing its Latin name alone, MUST offer each entry a control whose accessible name is "Remove" followed by that species' Latin name, which removes it and leaves the rest chosen, MUST let the user clear the whole selection at once, and MUST refuse a removal naming a species the page never offered. Without JavaScript, the system MUST offer an "Update selected" control under the results that brings the tally up to date with the ticks on screen, keeping the search term and its results.

#### Scenario: The tally reports the choice as a bold commodity line and its species, and clearing empties it
**ID**: SCN-COMMODITY-SELECT-008-A
- **GIVEN** the user has chosen one species on the commodity selection page
- **WHEN** the page next renders
- **THEN** the tally reports one chosen, showing the commodity as a bold line with the species beneath it
- **AND** each entry shows the species' Latin name alone, and offers a control whose accessible name is "Remove" followed by that Latin name
- **WHEN** the user clears the selection
- **THEN** the tally is no longer shown

#### Scenario: Removing one chosen species leaves the other chosen
**ID**: SCN-COMMODITY-SELECT-008-B
- **GIVEN** the user has chosen two species under different commodities
- **WHEN** they use the remove control named for one of them
- **THEN** that species is gone from the tally, the other is still chosen, and the results on screen are still listed

#### Scenario: With JavaScript off, searching, removing a species and clearing all still work
**ID**: SCN-COMMODITY-SELECT-008-C
- **GIVEN** the user has JavaScript turned off
- **WHEN** they search, remove one chosen species, and clear the selection
- **THEN** each of the three works

#### Scenario: Unticking a shown species and then removing it leaves it unchosen without an error
**ID**: SCN-COMMODITY-SELECT-008-D
- **GIVEN** the user has JavaScript turned off, and a species whose tick box is on screen and ticked
- **WHEN** the user clears that tick box and then uses that species' remove control
- **THEN** the page is shown with that species not chosen and the other choices still chosen, not an error page

#### Scenario: A removal naming a species the page never offered is refused and changes nothing
**ID**: SCN-COMMODITY-SELECT-008-E
- **GIVEN** a removal naming a species the page's results and the saved commodity lines have never held, however it was submitted
- **WHEN** the page responds
- **THEN** the request is refused, no page is rendered back, and the selection is unchanged

#### Scenario: With JavaScript off, Update selected brings the tally up to date with the ticks on screen
**ID**: SCN-COMMODITY-SELECT-008-F
- **GIVEN** the user has JavaScript turned off, has searched, and has ticked a species in the results
- **WHEN** they use the Update selected control
- **THEN** the tally shows that species as chosen
- **AND** the search term and its results are still shown

### Requirement: Saving without choosing a commodity is rejected on either save control
**ID**: REQ-COMMODITY-SELECT-009
The system MUST refuse to save from the commodity selection page when nothing has been chosen, on save and continue and on save and return to overview alike, showing "Select a commodity" in the error summary and inline on the search field, whether or not results are listed, with the summary link going to the search field. A selection already saved MUST stay as it was.

#### Scenario: Saving with nothing chosen shows an error summary
**ID**: SCN-COMMODITY-SELECT-009-A
- **GIVEN** the user is on the commodity selection page with nothing chosen
- **WHEN** they save and continue
- **THEN** an error summary headed "There is a problem" is shown, telling the user to select a commodity
- **AND** the same error shows inline on the search field, and the summary link goes to the search field

#### Scenario: Save and return to overview with nothing chosen shows the same error
**ID**: SCN-COMMODITY-SELECT-009-B
- **GIVEN** the user is on the commodity selection page with nothing chosen
- **WHEN** they save and return to overview
- **THEN** they stay on the page, which shows "Select a commodity" in the error summary and inline on the search field
- **AND** the commodity selection task reads "To do"

#### Scenario: With results listed, the error still sits on the search field
**ID**: SCN-COMMODITY-SELECT-009-C
- **GIVEN** the user has searched, so species are listed, and has chosen none
- **WHEN** they save and continue
- **THEN** "Select a commodity" shows in the error summary and inline on the search field, not on the listed species
- **AND** the summary link goes to the search field

#### Scenario: Save and return to overview after clearing a saved selection is refused and keeps the saved selection
**ID**: SCN-COMMODITY-SELECT-009-D
- **GIVEN** the user has a saved selection and clears it on the commodity selection page
- **WHEN** they save and return to overview
- **THEN** they stay on the page, which shows "Select a commodity"
- **AND** reopening the page shows the saved selection still chosen

### Requirement: A notification must carry at least one commodity line
**ID**: REQ-COMMODITY-SELECT-010
The system MUST require every notification to carry at least one commodity line, and MUST NOT let one with none be submitted.

#### Scenario: A notification with no commodity line cannot be submitted
**ID**: SCN-COMMODITY-SELECT-010-A
- **GIVEN** a notification carrying no commodity line
- **WHEN** the user tries to submit it
- **THEN** the submission is refused, and the missing commodity line is reported

### Requirement: The page says one notification is needed per ITAHC and how to search
**ID**: REQ-COMMODITY-SELECT-011
The system MUST show the inset "You must submit a separate notification for every single ITAHC. You must also submit a notification for goods that do not need an ITAHC." and the search hint "You can search by common name (for example, cattle), commodity code (0102), or Latin name (Bos taurus).", with no sentence about a minimum search length.

#### Scenario: The page explains the ITAHC rule and the ways to search
**ID**: SCN-COMMODITY-SELECT-011-A
- **GIVEN** the user has reached the commodity selection page
- **WHEN** the page loads
- **THEN** the inset reads "You must submit a separate notification for every single ITAHC. You must also submit a notification for goods that do not need an ITAHC."
- **AND** the search hint reads "You can search by common name (for example, cattle), commodity code (0102), or Latin name (Bos taurus)." with no sentence about a minimum number of characters

### Requirement: The page ends with Save and continue, Save and return to overview and Cancel and return to overview
**ID**: REQ-COMMODITY-SELECT-012
Outside an amendment the system MUST end the commodity selection page with "Save and continue", "Save and return to overview" and "Cancel and return to overview", in the opening sequence as when opened from Overview.

#### Scenario: The opening sequence offers all three controls
**ID**: SCN-COMMODITY-SELECT-012-A
- **GIVEN** the user is in the opening sequence on what are you importing
- **WHEN** the page is shown
- **THEN** it offers "Save and continue", "Save and return to overview" and "Cancel and return to overview"

### Requirement: Saving returns the user to the page that opened the question, else goes on
**ID**: REQ-COMMODITY-SELECT-013
The system MUST return the user to commodity details or identification details after a save on what are you importing when that page opened it, keeping any change context. Otherwise a save MUST go to the next step of the opening sequence, a save from a Change link on the review MUST go to commodity details, and save and return to overview MUST go to Overview.

#### Scenario: Opened from commodity details, saving returns there
**ID**: SCN-COMMODITY-SELECT-013-A
- **GIVEN** the user opened what are you importing from the Add another commodity link on commodity details
- **WHEN** they choose a further species and save and continue
- **THEN** commodity details is shown

#### Scenario: Opened from identification details, saving returns there
**ID**: SCN-COMMODITY-SELECT-013-B
- **GIVEN** the user opened what are you importing from identification details
- **WHEN** they save and continue
- **THEN** identification details is shown

#### Scenario: In the opening sequence, saving opens the reason for import
**ID**: SCN-COMMODITY-SELECT-013-C
- **GIVEN** the user is in the opening sequence on what are you importing
- **WHEN** they save and continue
- **THEN** the reason for import page is shown

#### Scenario: Opened from a review Change link, saving opens commodity details
**ID**: SCN-COMMODITY-SELECT-013-D
- **GIVEN** the user opened what are you importing from a Change link on the review
- **WHEN** they save and continue
- **THEN** commodity details is shown

#### Scenario: Opened from commodity details under a review Change, saving returns there keeping the change context
**ID**: SCN-COMMODITY-SELECT-013-E
- **GIVEN** the user opened what are you importing from commodity details, reached from a Change link on the review
- **WHEN** they save and continue
- **THEN** commodity details is shown, still carrying the change context

#### Scenario: A return value naming a page that does not open the question is ignored
**ID**: SCN-COMMODITY-SELECT-013-F
- **GIVEN** the user opened what are you importing with a return value that names a page other than commodity details or identification details
- **WHEN** they save and continue
- **THEN** the save goes where a save with no return value goes

### Requirement: One search lists no more than a hundred species
**ID**: REQ-COMMODITY-SELECT-014
The system MUST list no more than a hundred species for one search.

#### Scenario: A search matching more than a hundred species lists a hundred
**ID**: SCN-COMMODITY-SELECT-014-A
- **GIVEN** the user is on the commodity selection page
- **WHEN** they search for a term matching more than a hundred species
- **THEN** a hundred species are listed

### Requirement: Search results are listed in order: commodity heading, then species label
**ID**: REQ-COMMODITY-SELECT-015
The system MUST list a search's matching commodity groups in order of their commodity code, and MUST list each group's species in order of the label they are offered under.

#### Scenario: A search lists its groups and species alphabetically
**ID**: SCN-COMMODITY-SELECT-015-A
- **GIVEN** a search whose commodity lists its species in another order
- **WHEN** the results are shown
- **THEN** the species are listed in label order under their commodity heading, and the commodity groups are in heading order

### Requirement: The part of a heading or label the search matched is shown in bold
**ID**: REQ-COMMODITY-SELECT-016
The system MUST show, in bold, the part of a commodity heading or a species label that the search query matched, matching without regard to case or accents, and MUST leave the rest of the heading's or label's own reading unchanged.

#### Scenario: A search bolds the part of a species label it matched
**ID**: SCN-COMMODITY-SELECT-016-A
- **GIVEN** a search for part of a species' label
- **WHEN** the results are shown
- **THEN** that part of the label is in bold and the rest is not

#### Scenario: A search bolds the part of a commodity heading it matched
**ID**: SCN-COMMODITY-SELECT-016-B
- **GIVEN** a search for part of a commodity heading
- **WHEN** the results are shown
- **THEN** that part of the heading is in bold and the rest is not

### Requirement: With JavaScript, the results and the tally refresh in place
**ID**: REQ-COMMODITY-SELECT-017
With JavaScript on, the system MUST refresh the results and the tally on the same page, without the page reloading, as the user types, ticks or unticks a result, removes a species or clears the selection. It MUST announce through a polite status message how many species a typed search lists, or that it lists none. It MUST keep focus on a tick box the user used, and move focus to the search box when the control the user pressed is gone. When the results cannot be fetched, it MUST post the page as it would without JavaScript. A save pressed while a refresh is on its way MUST wait for it, so the save holds what the refresh shows. Each refresh MUST start from what the one before it left, so a later search never brings back a choice an earlier Clear all or remove took away. Escape in the search box or a click outside the search MUST hide the results, keeping the term and every choice, and focusing or clicking the search box MUST show them again. It MUST NOT show the Update selected control, because a tick brings the tally up to date itself.

#### Scenario: Typing lists the matching species without pressing Search
**ID**: SCN-COMMODITY-SELECT-017-A
- **GIVEN** the user has JavaScript turned on
- **WHEN** they type a term of three or more characters into the search box
- **THEN** the matching species are listed under their commodity, with the matched part in bold, and the page has not reloaded

#### Scenario: A typed search announces how many species it lists
**ID**: SCN-COMMODITY-SELECT-017-B
- **GIVEN** the user has JavaScript turned on
- **WHEN** they type a term that matches three species, then a term that matches none
- **THEN** a polite status message says "3 results available", then "No results found"

#### Scenario: Species ticked under two typed searches are both kept and saved
**ID**: SCN-COMMODITY-SELECT-017-C
- **GIVEN** the user has JavaScript turned on
- **WHEN** they tick a species under one typed search, then another under a second typed search, and save
- **THEN** the tally shows both before the save, and both are chosen when the page is opened again

#### Scenario: Unticking a species drops it from the tally and keeps focus on its tick box
**ID**: SCN-COMMODITY-SELECT-017-D
- **GIVEN** the user has JavaScript turned on and has ticked one species
- **WHEN** they untick it
- **THEN** the tally is no longer shown, and focus is still on that species' tick box

#### Scenario: Removing a species and clearing all work in place and return focus to the search box
**ID**: SCN-COMMODITY-SELECT-017-E
- **GIVEN** the user has JavaScript turned on and has chosen two species
- **WHEN** they use the remove control for one of them, then clear the selection
- **THEN** the tally first shows the other species alone, then is no longer shown, the search box keeps its term, and focus is on the search box after each

#### Scenario: When the results cannot be fetched, the search posts the page instead
**ID**: SCN-COMMODITY-SELECT-017-F
- **GIVEN** the user has JavaScript turned on and the results cannot be fetched
- **WHEN** they search
- **THEN** the page is posted and shows the results it lists without JavaScript

#### Scenario: A save pressed straight after Clear all holds nothing chosen
**ID**: SCN-COMMODITY-SELECT-017-G
- **GIVEN** the user has JavaScript turned on, has chosen one species, and the results are slow to arrive
- **WHEN** they clear the selection and save before the results have refreshed
- **THEN** the save is refused with "Select a commodity" and nothing is chosen

#### Scenario: A search pressed straight after Clear all keeps the cleared species out
**ID**: SCN-COMMODITY-SELECT-017-H
- **GIVEN** the user has JavaScript turned on, has chosen one species, and the results are slow to arrive
- **WHEN** they clear the selection, search for another species before the results have refreshed, tick it and save
- **THEN** only the species they ticked after clearing is chosen

#### Scenario: Escape hides the results and clicking the search box shows them again
**ID**: SCN-COMMODITY-SELECT-017-I
- **GIVEN** the user has JavaScript turned on and a typed search lists results
- **WHEN** they press Escape in the search box
- **THEN** the results are hidden and the search box keeps the term
- **WHEN** they click the search box
- **THEN** the results are shown again

#### Scenario: A click outside the search hides the results and keeps what is chosen
**ID**: SCN-COMMODITY-SELECT-017-J
- **GIVEN** the user has JavaScript turned on and has ticked a species in the results
- **WHEN** they click outside the search
- **THEN** the results are hidden and the species is still chosen

#### Scenario: With JavaScript on, no Update selected control is shown
**ID**: SCN-COMMODITY-SELECT-017-K
- **GIVEN** the user has JavaScript turned on and a search lists results
- **WHEN** the results are shown
- **THEN** there is no Update selected control

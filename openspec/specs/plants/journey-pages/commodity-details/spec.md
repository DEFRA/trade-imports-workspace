# Commodity Details Page Specification

## Purpose

The entry sub-page for one commodity line: asks which category of goods it is, then reveals the fields that category calls for. The page is titled "Commodity details".

## Requirements

### Requirement: The page opens on the category question alone, with no per-line fields yet
**ID**: REQ-PLANTS-COMMODITY-DETAILS-001
The system MUST ask what category of goods the line is, offering a continue action, and MUST show no per-line field — quantity or otherwise — until a category has been chosen and continued.

#### Scenario: The page presents the category question with nothing else revealed
**ID**: SCN-PLANTS-COMMODITY-DETAILS-001-A
- **GIVEN** the user has reached the commodity-details entry page for a new line
- **WHEN** the page loads
- **THEN** it asks what category of goods the line is, offering a continue action
- **AND** no quantity field is shown

### Requirement: Category guidance is shown where the commodity type needs it
**ID**: REQ-PLANTS-COMMODITY-DETAILS-002
The system MUST show preservative-treated-wood guidance when the notification's commodity type is wood and cut trees, and MUST show a short explanation under each plants-for-planting category that needs one.

#### Scenario: A wood notification carries the preservative guidance on the category question
**ID**: SCN-PLANTS-COMMODITY-DETAILS-002-A
- **GIVEN** the notification's commodity type is wood and cut trees
- **WHEN** the category question is shown
- **THEN** it includes the guidance that preservative-treated wood does not need notifying, except cut coniferous trees more than three metres high

#### Scenario: A plants-for-planting notification explains its two categories
**ID**: SCN-PLANTS-COMMODITY-DETAILS-002-B
- **GIVEN** the notification's commodity type is plants for planting
- **WHEN** the category question is shown
- **THEN** plants for planting and trees for planting each carry a short explanation of what they cover

### Requirement: Continuing with no category is refused, focusing the first option
**ID**: REQ-PLANTS-COMMODITY-DETAILS-003
The system MUST refuse to continue when no category has been chosen, showing an error that names the missing category, and MUST focus the first category option when the user follows the error.

#### Scenario: Continuing with nothing chosen shows the error and focuses the first option
**ID**: SCN-PLANTS-COMMODITY-DETAILS-003-A
- **GIVEN** the user is on the category question with nothing chosen
- **WHEN** they continue
- **THEN** an error is shown naming the missing category
- **WHEN** they follow the error
- **THEN** the first category option is focused

### Requirement: Choosing a category reveals the fields that category calls for
**ID**: REQ-PLANTS-COMMODITY-DETAILS-004
The system MUST reveal the per-line fields the chosen category calls for once the category is continued, so the user can enter them on the same page.

#### Scenario: A potato category reveals variety, quantity and intended use
**ID**: SCN-PLANTS-COMMODITY-DETAILS-004-A
- **GIVEN** the user is adding a line on a potatoes notification
- **WHEN** they choose seed potatoes and continue
- **THEN** variety, quantity and intended use are shown
- **AND** genus and commodity code are not

#### Scenario: A trees-for-planting category reveals size as well as the planting fields
**ID**: SCN-PLANTS-COMMODITY-DETAILS-004-B
- **GIVEN** the user is adding a line on a plants-for-planting notification
- **WHEN** they choose trees for planting and continue
- **THEN** species, EPPO code and size of the trees are shown

#### Scenario: A cut-coniferous-trees category reveals treatments and size, not a genus
**ID**: SCN-PLANTS-COMMODITY-DETAILS-004-C
- **GIVEN** the user is adding a line on a wood-and-cut-trees notification
- **WHEN** they choose cut coniferous trees more than three metres high and continue
- **THEN** phytosanitary treatments applied and size of the trees are shown
- **AND** genus is not

### Requirement: A complete line is accepted and returned to the list
**ID**: REQ-PLANTS-COMMODITY-DETAILS-005
The system MUST accept a fully answered line, saving it without error, and MUST return the user to the commodities list showing that line.

#### Scenario: Saving a complete potato line reaches the list with that line shown
**ID**: SCN-PLANTS-COMMODITY-DETAILS-005-A
- **GIVEN** the user has chosen a potato category and entered its variety, quantity and intended use
- **WHEN** they save and continue
- **THEN** the commodities list is shown naming that line

### Requirement: Save and add another returns to an empty category question
**ID**: REQ-PLANTS-COMMODITY-DETAILS-006
The system MUST let the user save the current line and immediately start another, returning them to the category question with no category chosen.

#### Scenario: Save and add another clears the category choice for the next line
**ID**: SCN-PLANTS-COMMODITY-DETAILS-006-A
- **GIVEN** the user has filled a complete potato line
- **WHEN** they choose save and add another
- **THEN** the category question is shown again with no category chosen

### Requirement: Invalid or missing answers are refused without discarding what was typed
**ID**: REQ-PLANTS-COMMODITY-DETAILS-007
The system MUST refuse a save when a required field is blank or a quantity is not a whole number above zero, MUST keep every valid value the user already typed, and MUST focus the field an error-summary link names.

#### Scenario: Leaving a required field blank keeps what was already typed
**ID**: SCN-PLANTS-COMMODITY-DETAILS-007-A
- **GIVEN** the user has entered a variety on a potato line but left quantity blank
- **WHEN** they save and continue
- **THEN** the save is refused naming the missing quantity
- **AND** the variety they typed is still shown

#### Scenario: A quantity that is not a whole number above zero is refused
**ID**: SCN-PLANTS-COMMODITY-DETAILS-007-B
- **GIVEN** the user has filled a potato line with quantity zero
- **WHEN** they save and continue
- **THEN** the save is refused naming the invalid quantity

#### Scenario: Following an error focuses the field it names
**ID**: SCN-PLANTS-COMMODITY-DETAILS-007-C
- **GIVEN** the page is showing a missing-quantity error
- **WHEN** the user follows that error in the summary
- **THEN** the quantity field is focused

### Requirement: Changing a saved line's category re-asks with the new fields
**ID**: REQ-PLANTS-COMMODITY-DETAILS-008
The system MUST rewrite a saved line to the newly chosen category and return the user to enter the fields that category calls for, dropping answers that no longer apply.

#### Scenario: Switching to trees for planting reveals the size field
**ID**: SCN-PLANTS-COMMODITY-DETAILS-008-A
- **GIVEN** the user is editing a plants-for-planting line that does not ask for a size
- **WHEN** they change its category to trees for planting and save
- **THEN** the page returns asking for the size of the trees as well

### Requirement: The back link depends on whether the consignment already holds a line
**ID**: REQ-PLANTS-COMMODITY-DETAILS-009
The system MUST send the user to the commodity-type page when they follow the back link before any commodity line is held, and to the commodities list once at least one line is held.

#### Scenario: The back link opens commodity type while the collection is empty
**ID**: SCN-PLANTS-COMMODITY-DETAILS-009-A
- **GIVEN** the consignment holds no commodity line
- **WHEN** the user follows the back link from commodity details
- **THEN** the commodity-type page is shown

#### Scenario: The back link opens the commodities list once a line is held
**ID**: SCN-PLANTS-COMMODITY-DETAILS-009-B
- **GIVEN** the consignment already holds at least one commodity line
- **WHEN** the user follows the back link from commodity details
- **THEN** the commodities list is shown

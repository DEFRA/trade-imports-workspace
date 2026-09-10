# Commodity Obligations Specification

## Purpose

What the commodities on a high-risk plants notification bring into play: the commodity type, the lines it holds, and which fields each line's category calls for.

## Requirements

### Requirement: A notification declares one commodity type, which decides the categories on offer
**ID**: REQ-PLANTS-OB-COMMODITY-001
The system MUST ask every notification for one commodity type — potatoes, plants for planting, or wood and cut trees — as a mandatory answer, and MUST narrow the categories a commodity line can declare to the set that type allows.

#### Scenario: Potatoes narrows a line to the two potato categories
**ID**: SCN-PLANTS-OB-COMMODITY-001-A
- **GIVEN** a notification's commodity type is potatoes
- **WHEN** a commodity line is added
- **THEN** only seed potatoes and ware potatoes are offered as its category

#### Scenario: Plants for planting narrows a line to the two planting categories
**ID**: SCN-PLANTS-OB-COMMODITY-001-B
- **GIVEN** a notification's commodity type is plants for planting
- **WHEN** a commodity line is added
- **THEN** only plants for planting and trees for planting are offered as its category

#### Scenario: Wood and cut trees narrows a line to the five wood categories
**ID**: SCN-PLANTS-OB-COMMODITY-001-C
- **GIVEN** a notification's commodity type is wood and cut trees
- **WHEN** a commodity line is added
- **THEN** only the five wood categories are offered as its category

### Requirement: A notification must hold at least one commodity line
**ID**: REQ-PLANTS-OB-COMMODITY-002
The system MUST require at least one commodity line on a notification, as a mandatory answer for the notification as a whole, judged across every line rather than only the most recently added.

#### Scenario: A notification with no line at all is rejected at continue
**ID**: SCN-PLANTS-OB-COMMODITY-002-A
- **GIVEN** a notification holds no commodity line
- **WHEN** the user tries to continue past the commodities list
- **THEN** the save is refused, naming the missing commodity line

### Requirement: Every commodity line declares a category and a quantity
**ID**: REQ-PLANTS-OB-COMMODITY-003
The system MUST ask every commodity line for a category, as a mandatory answer, and MUST ask every line for a quantity, as a mandatory answer, whatever its category.

#### Scenario: A line cannot be saved without a category
**ID**: SCN-PLANTS-OB-COMMODITY-003-A
- **GIVEN** the user is entering a commodity line
- **WHEN** they try to continue without choosing a category
- **THEN** the save is refused, naming the missing category

#### Scenario: A line cannot be saved without a valid quantity
**ID**: SCN-PLANTS-OB-COMMODITY-003-B
- **GIVEN** the user is entering a commodity line with a category chosen
- **WHEN** they try to save without a whole number above zero for quantity
- **THEN** the save is refused, naming the invalid quantity

### Requirement: A line's category decides which further fields it is asked for
**ID**: REQ-PLANTS-OB-COMMODITY-004
The system MUST ask a commodity line only for the further fields its category calls for — genus, species, commodity code, potato variety, potato intended use, EPPO code, size of the trees, or phytosanitary treatments — each as a mandatory answer where it applies, and MUST NOT ask for a field the category does not call for.

#### Scenario: A potato line asks for variety and intended use, not genus or commodity code
**ID**: SCN-PLANTS-OB-COMMODITY-004-A
- **GIVEN** a commodity line's category is seed potatoes or ware potatoes
- **WHEN** the user enters its details
- **THEN** it is asked for a variety, a quantity and an intended use
- **AND** it is not asked for a genus or a commodity code

#### Scenario: A trees-for-planting line asks for a size as well as genus, species and commodity code
**ID**: SCN-PLANTS-OB-COMMODITY-004-B
- **GIVEN** a commodity line's category is trees for planting
- **WHEN** the user enters its details
- **THEN** it is asked for a genus, a species, a commodity code, a quantity and the size of the trees

#### Scenario: A conifer-wood line asks for phytosanitary treatments, not a genus
**ID**: SCN-PLANTS-OB-COMMODITY-004-C
- **GIVEN** a commodity line's category is a wood category
- **WHEN** the user enters its details
- **THEN** it is asked for phytosanitary treatments applied
- **AND** a conifer-wood-with-bark line is not asked for a genus

#### Scenario: A hardwood line's genus is narrowed to the three hardwood genera
**ID**: SCN-PLANTS-OB-COMMODITY-004-D
- **GIVEN** a commodity line's category is hardwood round surface or hardwood chips
- **WHEN** the user searches the genus field
- **THEN** only Castanea, Fraxinus and Platanus are offered, not the full fifteen-genus list plants-for-planting and trees-for-planting lines search

### Requirement: Changing the commodity type discards lines that no longer match
**ID**: REQ-PLANTS-OB-COMMODITY-005
The system MUST discard every commodity line whose category does not belong to a newly chosen commodity type, and MUST warn the user before the change that saved lines will be removed.

#### Scenario: Changing type warns before any line is removed
**ID**: SCN-PLANTS-OB-COMMODITY-005-A
- **GIVEN** a notification holds at least one commodity line
- **WHEN** the user opens the commodity-type page again
- **THEN** it warns that changing the answer will remove the commodities already added

#### Scenario: Confirming a changed type reports what was removed
**ID**: SCN-PLANTS-OB-COMMODITY-005-B
- **GIVEN** a notification holds commodity lines that do not belong to a newly chosen type
- **WHEN** the user saves the new commodity type
- **THEN** those lines are removed
- **AND** the commodities list reports how many lines were removed and names the new type

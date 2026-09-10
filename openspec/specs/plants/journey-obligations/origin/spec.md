# Origin Obligations Specification

## Purpose

What a high-risk plants notification's country of origin brings into play, and how the countries on offer narrow according to its commodity lines.

## Requirements

### Requirement: A notification carries one country of origin, mandatory regardless of how many commodity lines it holds
**ID**: REQ-PLANTS-OB-ORIGIN-001
The system MUST ask a notification for one country of origin, as a mandatory notification-level answer, whatever commodity lines it carries.

#### Scenario: A single origin answer covers every commodity line
**ID**: SCN-PLANTS-OB-ORIGIN-001-A
- **GIVEN** a notification carries one or more commodity lines
- **WHEN** the user answers the origin question
- **THEN** that one answer is the notification's country of origin, not asked per line

### Requirement: The countries a notification may name narrow to the strictest scope any of its commodity lines carries
**ID**: REQ-PLANTS-OB-ORIGIN-002
The system MUST apply the narrowest country-of-origin scope that any one of the notification's commodity lines carries. A notification whose only commodity is seed potatoes MUST accept any country the origin field offers.

#### Scenario: A seed-potato consignment may name any country in the origin block
**ID**: SCN-PLANTS-OB-ORIGIN-002-A
- **GIVEN** a notification's only commodity line is seed potatoes
- **WHEN** the user chooses a country outside the EU that the origin field still offers
- **THEN** the country is accepted

### Requirement: Each non-seed commodity category carries a fixed origin country scope
**ID**: REQ-PLANTS-OB-ORIGIN-003
The system MUST narrow ware potatoes to Poland, Portugal, Romania or Spain; conifer wood without bark to Italy, France, Portugal or Spain; and plants for planting, trees for planting, conifer wood with bark, cut coniferous trees, hardwood round surface or hardwood chips to an EU member State.

#### Scenario: A ware-potato consignment is narrowed to Poland, Portugal, Romania or Spain
**ID**: SCN-PLANTS-OB-ORIGIN-003-A
- **GIVEN** a notification carries a ware-potato commodity line
- **WHEN** the user chooses a country outside Poland, Portugal, Romania and Spain
- **THEN** the country is rejected, naming those four countries as the ones that need notifying

#### Scenario: A conifer-wood-without-bark line is narrowed to Italy, France, Portugal or Spain
**ID**: SCN-PLANTS-OB-ORIGIN-003-B
- **GIVEN** a notification carries a conifer-wood-without-bark commodity line
- **WHEN** the user chooses an EU member State outside Italy, France, Portugal and Spain
- **THEN** the country is rejected, naming those four countries as the ones that need notifying

#### Scenario: A plants-for-planting line is narrowed to the EU member States
**ID**: SCN-PLANTS-OB-ORIGIN-003-C
- **GIVEN** a notification carries a plants-for-planting commodity line
- **WHEN** the user chooses a country that is not an EU member State
- **THEN** the country is rejected, naming an EU member State as what is needed

### Requirement: Adding a more restrictive commodity line re-validates an already-saved country
**ID**: REQ-PLANTS-OB-ORIGIN-004
The system MUST re-check a notification's saved country of origin against its commodity lines' narrowest scope the next time the origin page is saved, and MUST reject a country that scope no longer allows, even though it was accepted when it was first saved.

#### Scenario: A saved country is refused once a stricter commodity line joins it
**ID**: SCN-PLANTS-OB-ORIGIN-004-A
- **GIVEN** a notification has saved a country of origin that its current commodity lines allow
- **WHEN** the user adds a further commodity line whose scope is stricter and the country falls outside it
- **AND** they save the origin page again without changing the country
- **THEN** the save is refused, naming the stricter scope's allowed countries

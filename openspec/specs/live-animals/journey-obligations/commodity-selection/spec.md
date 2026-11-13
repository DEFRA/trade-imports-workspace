# Commodity Obligations Specification

## Purpose

What the commodities on a notification bring into play — the largest set of obligations in the journey, reaching each animal's identifiers, a line's package count, the County Parish Holding number and unweaned animals.

## Requirements

### Requirement: A commodity that calls for a County Parish Holding number brings it into play for the whole notification
**ID**: REQ-OB-COMMODITY-001
The system MUST ask the notification for a County Parish Holding number, as a mandatory answer, when any one of its commodity lines carries a commodity that calls for one, judged across every line rather than only the most recently added. Every commodity code calls for one except the codes let off — horses (0101) and cats, dogs, ferrets and other live mammals (01061900) — so a code new to the reference data is asked rather than let off.

#### Scenario: Adding a commodity that calls for a CPH number brings it into play
**ID**: SCN-OB-COMMODITY-001-A
- **GIVEN** a notification whose commodity lines do not call for a County Parish Holding number
- **WHEN** the user adds a commodity line whose commodity does call for one
- **THEN** the County Parish Holding number is asked for, as a mandatory answer for the notification as a whole

#### Scenario: A notification with no such commodity is not asked for one
**ID**: SCN-OB-COMMODITY-001-B
- **GIVEN** a notification whose commodity lines carry no commodity calling for a County Parish Holding number
- **WHEN** the user works through the journey
- **THEN** the County Parish Holding number is not asked for

#### Scenario: A commodity code on no list of its own is asked for a CPH number
**ID**: SCN-OB-COMMODITY-001-C
- **GIVEN** a notification whose only commodity line carries a code that no other commodity rule names
- **WHEN** the user works through the journey
- **THEN** the County Parish Holding number is asked for

### Requirement: A commodity that requires unweaned-animal tracking brings that question into play for the whole notification
**ID**: REQ-OB-COMMODITY-002
The system MUST ask whether the consignment contains unweaned animals, as a mandatory answer, when any one of its commodity lines carries equines (0101), cattle (0102), pigs (0103), sheep (010410) or goats (010420), and MUST NOT ask it for any other commodity.

#### Scenario: Adding a commodity requiring unweaned tracking brings the question into play
**ID**: SCN-OB-COMMODITY-002-A
- **GIVEN** a notification whose commodity lines carry no commodity requiring unweaned-animal tracking
- **WHEN** the user adds a line carrying a cattle commodity
- **THEN** the notification is asked whether it contains unweaned animals, as a mandatory answer

#### Scenario: A cats-dogs-and-ferrets-only consignment is not asked about unweaned animals
**ID**: SCN-OB-COMMODITY-002-B
- **GIVEN** a notification whose only commodity line carries the cats, dogs, ferrets and other live mammals commodity (01061900)
- **WHEN** the user works through the journey
- **THEN** the notification is not asked whether it contains unweaned animals

#### Scenario: Adding an equine, pig, sheep or goat commodity also brings the question into play
**ID**: SCN-OB-COMMODITY-002-D
- **GIVEN** a notification whose commodity lines carry no commodity requiring unweaned-animal tracking
- **WHEN** the user adds a line carrying an equine, a pig, a sheep or a goat commodity
- **THEN** the notification is asked whether it contains unweaned animals, as a mandatory answer

#### Scenario: Changing the commodities to cats or dogs only clears a saved unweaned answer
**ID**: SCN-OB-COMMODITY-002-C
- **GIVEN** a notification with a cattle line and a saved answer to whether it contains unweaned animals
- **WHEN** the user changes the commodity choice so that every species is under commodity code 01061900, such as Cat or Dog, and saves it
- **THEN** the saved answer is cleared and check answers no longer shows it
- **AND** choosing cattle again asks the question afresh

### Requirement: Only a commodity that is counted in packages is asked for a number of packages
**ID**: REQ-OB-COMMODITY-003
The system MUST optionally ask a line for a number of packages when its code is 0101 (equines), 0102 (cattle), 0103 (pigs), 010410 (sheep), 010420 (goats), 01051111/01051200/01051300/01051400/01051500/01059400/01059910/01059920/01059930/01059950 (poultry), 01061410 (domestic rabbits), 01061900 (other live mammals), 01062000 (reptiles), 01063100 (birds of prey), 01063200 (parrots), 01063980 (other birds), 01064100 (bees) or 01064900 (other insects), and MUST NOT ask any other served code.

#### Scenario: A line whose commodity is counted in packages is asked for a package count
**ID**: SCN-OB-COMMODITY-003-A
- **GIVEN** the user has added a commodity line
- **WHEN** its commodity is one counted in packages
- **THEN** that line is asked for a number of packages, as an optional answer

#### Scenario: A line whose commodity is not counted in packages is asked for a number of animals only
**ID**: SCN-OB-COMMODITY-003-B
- **GIVEN** the user has added a commodity line
- **WHEN** its commodity is one the reference data serves but is not counted in packages
- **THEN** that line is asked for a number of animals only, both on the commodity details page and on the review

### Requirement: A line's commodity and species decide which identifiers its animals are asked for, and a commodity can call for more than one
**ID**: REQ-OB-COMMODITY-004
The system MUST ask each animal on a commodity line only for the identifiers its commodity and species call for — a microchip, a passport, a tattoo, an ear tag or a horse name — each as an optional answer, MUST NOT ask for an identifier the commodity and species do not call for, and MUST ask for every identifier a commodity calls for where it calls for more than one.

#### Scenario: A commodity calling for particular identifiers asks only for those
**ID**: SCN-OB-COMMODITY-004-A
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for a microchip, a passport and a tattoo, but not an ear tag
- **THEN** the microchip, passport and tattoo are all asked for
- **AND** the ear tag is not asked for

#### Scenario: A commodity calling for two identifiers asks for both together, for the species both are listed for
**ID**: SCN-OB-COMMODITY-004-B
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's species is the one its commodity's horse name is listed for, and that commodity also calls for a microchip for every species it serves
- **THEN** both the microchip and the horse name are asked for together

#### Scenario: Two species under one commodity code are asked for different identifiers
**ID**: SCN-OB-COMMODITY-004-C
- **GIVEN** the user is entering identification details for animals on two lines sharing one commodity code, one of the species the commodity's horse name is listed for and one of a different species under that code
- **WHEN** identification details are entered for each animal
- **THEN** the animal of the listed species is asked for the horse name
- **AND** the animal of the other species is not asked for the horse name
- **AND** both animals are asked for every identifier their commodity code lists without naming a species

#### Scenario: A commodity that lists one identifier asks for that one alone
**ID**: SCN-OB-COMMODITY-004-D
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for an ear tag and no other identifier
- **THEN** the ear tag is asked for
- **AND** no other identifier is asked for

### Requirement: A commodity with no identifier of its own is asked for identification details and a description instead
**ID**: REQ-OB-COMMODITY-005
The system MUST ask for two free-text answers, "Identification details" and "Description", each optional and at most 58 characters, for an animal whose commodity calls for none of the microchip, passport, tattoo, ear tag or horse name, and MUST NOT ask for them of an animal whose commodity declares one of those typed identifiers.

#### Scenario: A commodity with no specific identifier is asked for the two free-text answers
**ID**: SCN-OB-COMMODITY-005-A
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for none of the specific identifiers
- **THEN** "Identification details" and "Description" are asked for that animal, each optional and at most 58 characters
- **AND** no typed identifier is asked for that animal

#### Scenario: A commodity declaring its own identifiers is not asked for the two free-text answers
**ID**: SCN-OB-COMMODITY-005-B
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity declares one of the specific identifiers
- **THEN** neither "Identification details" nor "Description" is asked for that animal

### Requirement: A commodity that requires a permanent address asks for one per animal
**ID**: REQ-OB-COMMODITY-006
The system MUST ask for a permanent address for each animal on a line whose commodity and species pair is listed as needing one, as a mandatory answer, and MUST NOT ask for it otherwise. The answer MUST also record where the animal lives, leaving scope together with the permanent address itself.

#### Scenario: A commodity requiring a permanent address asks for one for each animal
**ID**: SCN-OB-COMMODITY-006-A
- **GIVEN** the user is on the permanent address page for an animal on a commodity line of commodity code 01061900 and species the domestic cat (Felis catus), the domestic dog (Canis familiaris) or the ferret (Mustela putorius furo)
- **WHEN** the permanent address page is shown
- **THEN** a permanent address is asked for, as a mandatory answer for that animal

#### Scenario: Another species under the same code is not asked for one
**ID**: SCN-OB-COMMODITY-006-B
- **GIVEN** an animal on a line of the genus Felis
- **WHEN** the permanent address page is shown
- **THEN** no permanent address is asked for, and no card is shown for that animal

#### Scenario: A listed species under another code is not asked for one
**ID**: SCN-OB-COMMODITY-006-C
- **GIVEN** an animal on a line of Felis catus under a code other than 01061900
- **WHEN** the permanent address page is shown
- **THEN** no permanent address is asked for, and no card is shown for that animal

#### Scenario: The choice of where the animal lives leaves scope together with the permanent address
**ID**: SCN-OB-COMMODITY-006-D
- **GIVEN** an animal on a line whose commodity requires a permanent address
- **WHEN** the line's commodity or species changes to one that does not
- **THEN** the permanent address and the choice of where the animal lives both leave scope

### Requirement: The commodities asked for an ear tag are cattle, pigs, sheep and goats, and no other served code
**ID**: REQ-OB-COMMODITY-007
The system MUST ask each animal on a commodity line for an ear tag when that line's commodity code is 0102 (cattle), 0103 (pigs), 010410 (sheep) or 010420 (goats), as an optional answer, and MUST NOT ask for an ear tag on any other served code.

#### Scenario: A pig, sheep or goat line is asked for an ear tag
**ID**: SCN-OB-COMMODITY-007-A
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity is pigs (0103), sheep (010410) or goats (010420)
- **THEN** the ear tag is asked for, as an optional answer

#### Scenario: A line of a code not on the ear-tag list is not asked for an ear tag
**ID**: SCN-OB-COMMODITY-007-B
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity code is not 0102, 0103, 010410 or 010420
- **THEN** the ear tag is not asked for

### Requirement: The commodities asked for a tattoo are cattle, pigs, and cats, dogs, ferrets and other live mammals, and no other served code
**ID**: REQ-OB-COMMODITY-008
The system MUST ask each animal on a commodity line for a tattoo when that line's commodity code is 0102 (cattle), 0103 (pigs) or 01061900 (cats, dogs, ferrets and other live mammals), as an optional answer, and MUST NOT ask for a tattoo on any other served code.

#### Scenario: A cattle line and a pig line are each asked for a tattoo
**ID**: SCN-OB-COMMODITY-008-A
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity is cattle (0102) or pigs (0103)
- **THEN** the tattoo is asked for, as an optional answer

#### Scenario: A line of a code not on the tattoo list is not asked for a tattoo
**ID**: SCN-OB-COMMODITY-008-B
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity code is not 0102, 0103 or 01061900
- **THEN** the tattoo is not asked for


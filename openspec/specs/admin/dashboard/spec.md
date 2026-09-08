# Admin Dashboard Specification

## Purpose

The admin interface's landing page, and the route from it into the areas an operator works in.

## Requirements

### Requirement: The admin dashboard is where a signed-in operator lands
The system MUST show the admin dashboard as the landing page for a signed-in operator.

#### Scenario: A signed-in operator lands on the admin dashboard
- **GIVEN** the operator is signed into the admin interface
- **WHEN** they open the admin service
- **THEN** the admin dashboard is shown

### Requirement: The dashboard leads to the notifications area
The system MUST offer the operator a route from the admin dashboard into the notifications area.

#### Scenario: The operator opens the notifications area from the dashboard
- **GIVEN** the operator is on the admin dashboard
- **WHEN** they choose to open the notifications area
- **THEN** the notifications page is shown

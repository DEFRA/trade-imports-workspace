# PIMS Dynamics fields left empty after a submitted GBN-AG notification

The two `test.fixme` tests in `trade-imports-ins-tests`
(`tests/animals/e2e/journeys/dynamics/notification-data-gaps.spec.ts`) assert
fields that PIMS Dynamics leaves empty today. This page holds the GBN-AG path
each field is read from and the likely cause, so the spec carries no comments.

Added in is the GBN-AG PIMS schema version (gbn-ag-pims-v0.x.0) that first carried the path. "Not mapped?" and
"option not matched?" are suspected causes, not confirmed ones.

## Mandatory answers

| Dynamics column | GBN-AG path | Added in | Likely cause |
|---|---|---|---|
| `defraimp_commodityspeciesname`, `defraimp_commodityspeciescommonname` | `specifiedConsignment.includedConsignmentItem[].includedTradeLineItem[].scientificName` and `commonName` | v0.2.0 | |
| `defraimp_<party>addresspostalzipcode`, `defraimp_placeoforiginpostcode` | each party's `postalAddress.postcodeCode` | v0.2.0 | |
| `defraimp_<party>addresstelephone`, `defraimp_placeoforiginphone` | each party's `definedContact[].telephoneUniversalCommunication` | v0.2.0 | |
| `defraimp_<party>addressemail`, `defraimp_placeoforiginemail` | each party's `definedContact[].emailURIUniversalCommunication` | v0.2.0 | |
| `defraimp_cphnumber` | `specifiedConsignment.finalDestinationLocation.identifier` | v0.2.0 | |
| `defraimp_meansoftransporttoentrypointdocument` | `specifiedConsignment.mainCarriageLogisticsTransportMovement[].transportContractRelatedReferencedDocument[]` | v0.2.0 | |
| `defraimp_purposeofconsignment` | `exchangedDocument.firstSignatoryAuthentication.includedClause[]` where `identifier` is `PURPOSE` | v0.1.0 | Option not matched? |
| `defraimp_commoditiesinternalmarketpurpose` | the same clause list where `identifier` is `INTERNAL_MARKET_PURPOSE` | v0.1.0 | Option not matched? |
| `defraimp_commoditiescertifiedfor` | the same clause list where `identifier` is `GOODS_CERTIFIED_AS` | v0.1.0 | Option not matched? |
| `defraimp_commoditiesnumberofanimals` | `specifiedConsignment.includedConsignmentItem[].includedTradeLineItem[].specifiedLineTradeDelivery[].productUnitQuantity.content` | v0.1.0 | Not mapped? |
| `defraimp_identificationofanimalstext` (ear tag) | `…individualTradeProductInstance[].identifier[]` where `typeCode` is `EAR_TAG` | v0.1.0 | Not mapped? |
| `defraimp_meansoftransporttoentrypointid` | `specifiedConsignment.mainCarriageLogisticsTransportMovement[].usedLogisticsTransportMeans.name` | v0.1.0 | Not mapped? |

## Optional answers

| Dynamics column | GBN-AG path | Added in | Likely cause |
|---|---|---|---|
| `defraimp_commoditiesregionoforigin` | `specifiedConsignment.originCountry.regionOfOriginCode` | v0.3.0 | |
| `defraimp_routetransitingstates` | `specifiedConsignment.transitTradeCountry[]` | v0.2.0 | |
| `defraimp_commoditiesnumberofpackages` | `…includedTradeLineItem[].physicalReferencedLogisticsPackage[].itemQuantity` | v0.1.0 | Not mapped? |
| `defraimp_identificationofanimalstext` (passport number) | `…individualTradeProductInstance[].identifier[]` where `typeCode` is `PASSPORT` | v0.1.0 | Not mapped? |

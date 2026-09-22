The eight NOSTOS islands previously relied on sparse props and repeated ruins. This candidate gives each island an authored spatial structure while preserving all story IDs, dialogue, NPCs, memories and act ordering.

Circe and Cyclops gain inhabitable galleries and cave facilities. The remaining six add Ithaca's asymmetric courtyard house, the lotus orchard shelters and descending irrigation channel, continuous Siren rock strata and moored wrecks, Calypso's domestic and boatbuilding spaces, and restrained tidal/ritual terrain for the prologue and Nekyia. Shared changes add wall-segment collision, matching walk surfaces, sheltered weather, mobile controls, quality tiers and adaptive resolution.

The implementation includes the fine-grained R2 spec, a 34-item implementation matrix, 24 fixed-camera before/after pairs and six supplemental spatial views. Asset IDs, the active context, provenance and iteration records are updated. The design document's UTF-8 response is also fixed.

Validation: 181 unit tests, TypeScript, production and asset-workbench builds, library/context/asset audits; five browser checks covering the eight-act touch journey, ending/restart, three complete island-switch cycles, multi-touch/orientation and quality rendering. Warm geometry and texture counts remain stable. Reproduction commands and logs are in `games/nostos/runs/run-20260922-eight-islands-r2/verification.json`.

This is a review candidate. Human visual acceptance and iPhone 13 Safari / Pixel 6 Chrome sustained 15-minute performance remain unverified. Desktop samples are diagnostic evidence only. This PR does not merge or deploy to Pages.

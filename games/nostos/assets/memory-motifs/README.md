# Memory silhouettes

Sixteen 512x512 RGBA masks used by VisionStage through memory-silhouettes.ts.
World NPCs still use procedural textures. The shader samples alpha and colors
it with uInk; mipmaps and reveal/dissolve effects remain enabled.

## Rebuild

Requires Python 3.10+ and Pillow. Run from the repository root:

```sh
python games/nostos/tools/assets/split-memory-motifs.py --source games/nostos/runs/run-20260904-nostos-build/gate3/nostos-black-figure-motifs-4x4-v1.png --out-dir games/nostos/assets/memory-motifs --evidence-dir games/nostos/runs/run-20260905-nostos-memory-motifs-r1/evidence/edge-cleanup
npm run build:nostos
```

The generator insets each detected cell by four source pixels, maps luminance to
alpha, and removes tiny connected islands and thin peripheral divider fragments.
It retains multiple detached subject components and grayscale alpha.
Tight ink bounds receive sampling padding before fitting to a 432px content area
on a transparent 512px canvas. Reframing can make some motifs slightly larger.

manifest.json records stable asset IDs, source/output hashes and version.
The evidence directory contains a contact sheet, before/after comparison and
pixel report. The comparison preserves its original before-images on reruns.

Source preprocessing and production build passed (exit 0); all 16 after-images
were reviewed on a plaster background. E2E was not run at the user's request.
Human in-game visual review remains pending; this is not Gate 3 approval.
Reload the game to replace already cached in-memory textures.

#!/usr/bin/env python3
"""Split a NOSTOS 4x4 concept sheet into 16 transparent runtime masks."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


MOTIFS = (
    "galley", "rower", "standing", "reaching",
    "bound", "kneeling", "eye", "hand",
    "siren", "loom", "flock", "shades",
    "wreath", "threshold", "wave", "flame",
)
OUTPUT_SIZE = 512
CONTENT_SIZE = 432
OPAQUE_LUMA = 60
TRANSPARENT_LUMA = 145
CELL_INSET = 4


def clean_periphery(alpha: Image.Image) -> tuple[Image.Image, int]:
    """Remove isolated paper specks and thin divider fragments, not fine limbs.

    Eight-connected components preserve every detached subject part. Only tiny
    components and thin components confined to a cell edge are discarded.
    """
    width, height = alpha.size
    pixels = bytearray(alpha.tobytes())
    visited = bytearray(len(pixels))
    removed = 0
    for seed, value in enumerate(pixels):
        if not value or visited[seed]:
            continue
        visited[seed] = 1
        component = [seed]
        for position in component:
            x, y = position % width, position // width
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    neighbor = ny * width + nx
                    if pixels[neighbor] and not visited[neighbor]:
                        visited[neighbor] = 1
                        component.append(neighbor)
        xs = [p % width for p in component]
        ys = [p // width for p in component]
        left, right, top, bottom = min(xs), max(xs), min(ys), max(ys)
        cw, ch = right - left + 1, bottom - top + 1
        near_edge = right < 10 or left >= width - 10 or bottom < 10 or top >= height - 10
        divider = near_edge and min(cw, ch) <= 3 and max(cw, ch) >= 12
        if len(component) <= 6 or divider:
            removed += len(component)
            for position in component:
                pixels[position] = 0
    return Image.frombytes('L', alpha.size, bytes(pixels)), removed


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def contiguous_runs(values: list[int]) -> list[tuple[int, int]]:
    if not values:
        return []
    runs: list[tuple[int, int]] = []
    start = previous = values[0]
    for value in values[1:]:
        if value != previous + 1:
            runs.append((start, previous))
            start = value
        previous = value
    runs.append((start, previous))
    return runs


def detect_dividers(gray: Image.Image, axis: str) -> list[tuple[int, int]]:
    width, height = gray.size
    size = (width, 1) if axis == "x" else (1, height)
    profile = list(gray.resize(size, Image.Resampling.BOX).tobytes())
    runs = contiguous_runs([index for index, mean in enumerate(profile) if mean < 60])
    if len(runs) != 5:
        raise RuntimeError(f"Expected five {axis}-axis dividers, found {runs}")
    return runs


def alpha_for_luma(luma: int) -> int:
    if luma <= OPAQUE_LUMA:
        return 255
    if luma >= TRANSPARENT_LUMA:
        return 0
    amount = (TRANSPARENT_LUMA - luma) / (TRANSPARENT_LUMA - OPAQUE_LUMA)
    smooth = amount * amount * (3.0 - 2.0 * amount)
    alpha = round(255 * smooth)
    return 0 if alpha < 10 else alpha


def extract(cell: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int], int]:
    alpha = cell.convert("L").point(alpha_for_luma)
    alpha, removed = clean_periphery(alpha)
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("Cell contains no foreground ink")
    # Keep transparent sampling support around the tight box before resizing.
    bbox = (max(0, bbox[0] - 2), max(0, bbox[1] - 2),
            min(alpha.width, bbox[2] + 2), min(alpha.height, bbox[3] + 2))
    alpha = alpha.crop(bbox)
    scale = min(CONTENT_SIZE / alpha.width, CONTENT_SIZE / alpha.height)
    size = (max(1, round(alpha.width * scale)), max(1, round(alpha.height * scale)))
    alpha = alpha.resize(size, Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    ink = Image.new("RGBA", size, (0, 0, 0, 255))
    ink.putalpha(alpha)
    output.alpha_composite(ink, ((OUTPUT_SIZE - size[0]) // 2, (OUTPUT_SIZE - size[1]) // 2))
    return output, bbox, removed


def alpha_metrics(image: Image.Image) -> dict[str, object]:
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    border = (
        list(alpha.crop((0, 0, OUTPUT_SIZE, 1)).tobytes())
        + list(alpha.crop((0, OUTPUT_SIZE - 1, OUTPUT_SIZE, OUTPUT_SIZE)).tobytes())
        + list(alpha.crop((0, 1, 1, OUTPUT_SIZE - 1)).tobytes())
        + list(alpha.crop((OUTPUT_SIZE - 1, 1, OUTPUT_SIZE, OUTPUT_SIZE - 1)).tobytes())
    )
    nonzero = sum(histogram[1:])
    return {
        "alphaExtrema": list(alpha.getextrema()),
        "nonzeroPixels": nonzero,
        "occupancy": round(nonzero / (OUTPUT_SIZE * OUTPUT_SIZE), 6),
        "outputInkBounds": list(alpha.getbbox() or (0, 0, 0, 0)),
        "nontransparentBorderPixels": sum(value > 0 for value in border),
    }


def checkerboard(size: tuple[int, int], tile: int = 16) -> Image.Image:
    image = Image.new("RGBA", size, (225, 218, 202, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(197, 188, 170, 255))
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--evidence-dir", type=Path, required=True)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGB")
    gray = source.convert("L")
    x_dividers = detect_dividers(gray, "x")
    y_dividers = detect_dividers(gray, "y")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    args.evidence_dir.mkdir(parents=True, exist_ok=True)
    preview_cell = 288
    preview = checkerboard((preview_cell * 4, preview_cell * 4))
    preview_draw = ImageDraw.Draw(preview)
    records: list[dict[str, object]] = []
    comparison = Image.new('RGBA', (512 * 4, 280 * 4), (231, 217, 190, 255))
    comparison_draw = ImageDraw.Draw(comparison)

    for index, name in enumerate(MOTIFS):
        row, column = divmod(index, 4)
        left = x_dividers[column][1] + 1 + CELL_INSET
        right = x_dividers[column + 1][0] - CELL_INSET
        top = y_dividers[row][1] + 1 + CELL_INSET
        bottom = y_dividers[row + 1][0] - CELL_INSET
        output, source_bbox, removed = extract(source.crop((left, top, right, bottom)))
        output_path = args.out_dir / f"{name}.png"
        if output_path.exists():
            with Image.open(output_path) as before:
                comparison.alpha_composite(before.convert('RGBA').resize((256, 256)), (column * 512, row * 280))
        comparison.alpha_composite(output.resize((256, 256)), (column * 512 + 256, row * 280))
        comparison_draw.text((column * 512 + 10, row * 280 + 260), f'{name}: before / after', fill=(26, 19, 16, 255))
        output.save(output_path, "PNG", optimize=True)
        thumb = output.resize((256, 256), Image.Resampling.LANCZOS)
        preview.alpha_composite(thumb, (column * preview_cell + 16, row * preview_cell + 16))
        preview_draw.rectangle(
            (column * preview_cell + 8, row * preview_cell + 8, (column + 1) * preview_cell - 8, (row + 1) * preview_cell - 8),
            outline=(67, 48, 34, 255), width=2,
        )
        preview_draw.text((column * preview_cell + 16, (row + 1) * preview_cell - 26), name, fill=(67, 48, 34, 255))
        records.append({
            "kind": name,
            "file": output_path.as_posix(),
            "sourceCell": [left, top, right, bottom],
            "sourceInkBoundsInCell": list(source_bbox),
            "removedNoisePixels": removed,
            "dimensions": [OUTPUT_SIZE, OUTPUT_SIZE],
            "bytes": output_path.stat().st_size,
            "sha256": sha256(output_path),
            **alpha_metrics(output),
        })

    preview_path = args.evidence_dir / "memory-motifs-contact-sheet.png"
    preview.save(preview_path, "PNG", optimize=True)
    comparison_path = args.evidence_dir / 'edge-cleanup-comparison.png'
    if not comparison_path.exists():
        comparison.save(comparison_path, 'PNG', optimize=True)
    report = {
        "source": args.source.as_posix(),
        "sourceSha256": sha256(args.source),
        "sourceDimensions": list(source.size),
        "xDividersInclusive": [list(run) for run in x_dividers],
        "yDividersInclusive": [list(run) for run in y_dividers],
        "alphaMapping": {
            "opaqueAtOrBelowLuma": OPAQUE_LUMA,
            "transparentAtOrAboveLuma": TRANSPARENT_LUMA,
            "interpolation": "smoothstep",
        },
        "outputSize": OUTPUT_SIZE,
        "contentFit": CONTENT_SIZE,
        "cellInset": CELL_INSET,
        "cleanup": "8-connected components: <=6 pixels, or thin fragments confined to a cell edge",
        "assets": records,
    }
    report_path = args.evidence_dir / "memory-motifs-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {len(records)} assets to {args.out_dir}")
    print(f"QA report: {report_path}")
    print(f"Contact sheet: {preview_path}")


if __name__ == "__main__":
    main()

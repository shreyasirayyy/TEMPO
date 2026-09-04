from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw

ROOT = Path('/home/ubuntu/tempo')
SOURCE_ROOT = Path('/home/ubuntu/projects/ggg-04d37be8')
BRANDING = ROOT / 'public' / 'branding'
SOURCE_DIR = BRANDING / 'source'
ICONS = ROOT / 'public' / 'icons'


def connected_white_background(image: Image.Image, threshold: int = 42) -> Image.Image:
    """Remove only near-white pixels connected to the outer edge.

    This avoids erasing the mascot's cream body or white details that are enclosed
    by the artwork. The original JPEG sources remain untouched in branding/source.
    """
    rgb = np.asarray(image.convert('RGB'), dtype=np.int16)
    distance = np.max(np.abs(rgb - 255), axis=2)
    candidate = distance <= threshold
    height, width = candidate.shape
    visited = np.zeros_like(candidate, dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        if candidate[0, x]:
            visited[0, x] = True
            queue.append((0, x))
        if candidate[height - 1, x] and not visited[height - 1, x]:
            visited[height - 1, x] = True
            queue.append((height - 1, x))
    for y in range(height):
        if candidate[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            queue.append((y, 0))
        if candidate[y, width - 1] and not visited[y, width - 1]:
            visited[y, width - 1] = True
            queue.append((y, width - 1))

    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < height and 0 <= nx < width and candidate[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    rgba = np.dstack((rgb.clip(0, 255).astype(np.uint8), np.full((height, width), 255, dtype=np.uint8)))
    rgba[..., 3][visited] = 0
    return Image.fromarray(rgba, 'RGBA')


def crop_transparent(image: Image.Image, padding_ratio: float, square: bool = False) -> Image.Image:
    alpha = image.getchannel('A')
    bbox = alpha.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    width, height = right - left, bottom - top
    pad_x = max(2, int(width * padding_ratio))
    pad_y = max(2, int(height * padding_ratio))
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(image.width, right + pad_x)
    bottom = min(image.height, bottom + pad_y)
    cropped = image.crop((left, top, right, bottom))
    if not square:
        return cropped

    side = max(cropped.width, cropped.height)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas


def save_optimized(image: Image.Image, png_path: Path, webp_path: Path) -> None:
    image.save(png_path, format='PNG', optimize=True)
    image.save(webp_path, format='WEBP', quality=94, method=6)


def make_app_icon(mark: Image.Image, size: int, safe: bool = False) -> Image.Image:
    background = Image.new('RGBA', (size, size), '#f8f4ed')
    inset = int(size * (0.18 if safe else 0.12))
    target = size - inset * 2
    resized = mark.copy()
    resized.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2
    background.alpha_composite(resized, (x, y))
    return background


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)

    logo_source = SOURCE_ROOT / 'tempoo logo.jpeg'
    mascot_source = SOURCE_ROOT / 'tempo mascot.jpeg'
    logo_original_target = SOURCE_DIR / 'tempoo-logo.jpeg'
    mascot_original_target = SOURCE_DIR / 'tempo-mascot.jpeg'
    logo_original_target.write_bytes(logo_source.read_bytes())
    mascot_original_target.write_bytes(mascot_source.read_bytes())

    logo = crop_transparent(connected_white_background(Image.open(logo_source), threshold=42), padding_ratio=0.035, square=True)
    mascot = crop_transparent(connected_white_background(Image.open(mascot_source), threshold=42), padding_ratio=0.035, square=False)

    save_optimized(logo, BRANDING / 'tempo-logo.png', BRANDING / 'tempo-logo.webp')
    save_optimized(mascot, BRANDING / 'tempo-mascot.png', BRANDING / 'tempo-mascot.webp')

    for size, name in ((192, 'icon-192.png'), (512, 'icon-512.png')):
        make_app_icon(logo, size).save(ICONS / name, format='PNG', optimize=True)
    make_app_icon(logo, 512, safe=True).save(ICONS / 'icon-512-maskable.png', format='PNG', optimize=True)
    make_app_icon(logo, 180).save(ICONS / 'apple-touch-icon.png', format='PNG', optimize=True)
    make_app_icon(logo, 64).save(ICONS / 'favicon-64.png', format='PNG', optimize=True)
    make_app_icon(logo, 32).save(ICONS / 'favicon-32.png', format='PNG', optimize=True)
    make_app_icon(logo, 16).save(ICONS / 'favicon-16.png', format='PNG', optimize=True)
    make_app_icon(logo, 48).save(ICONS / 'favicon-48.png', format='PNG', optimize=True)

    # ICO supports multiple favicon resolutions in a single browser-friendly file.
    ico = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    icon_48 = make_app_icon(logo, 48)
    ico.alpha_composite(icon_48)
    ico.save(ICONS / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

    print('Prepared:', BRANDING)
    for path in sorted(BRANDING.rglob('*')):
        if path.is_file():
            print(path.relative_to(ROOT), path.stat().st_size)
    for path in sorted(ICONS.glob('*')):
        print(path.relative_to(ROOT), path.stat().st_size)


if __name__ == '__main__':
    main()

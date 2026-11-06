"""Builds a 1280x800 store screenshot (RGB, no alpha): caption on the left, cropped UI on the right.
Usage: python3 make_screenshot.py <input.png> <output.png> "<title>" "<subtitle>"
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 800
BG, INK, MUTED, LINE = (245, 246, 249), (19, 21, 26), (90, 96, 112), (220, 224, 231)
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"


def wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def main(src, out, title, subtitle):
    ui = Image.open(src).convert("RGB")
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    # UI on the right, scaled to fit a 620x680 box, with a soft shadow and hairline border.
    box_w, box_h = 620, 680
    scale = min(box_w / ui.width, box_h / ui.height)
    ui = ui.resize((round(ui.width * scale), round(ui.height * scale)), Image.LANCZOS)
    x = W - 60 - ui.width
    y = (H - ui.height) // 2
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle([x, y + 14, x + ui.width, y + ui.height + 14], 18, fill=70)
    canvas.paste((205, 210, 222), mask=shadow.filter(ImageFilter.GaussianBlur(22)))
    canvas.paste(ui, (x, y))
    draw.rectangle([x - 1, y - 1, x + ui.width, y + ui.height], outline=LINE, width=1)

    # Caption on the left.
    text_w = x - 60 - 70
    title_font, sub_font = ImageFont.truetype(BOLD, 50), ImageFont.truetype(REGULAR, 26)
    title_lines = wrap(draw, title, title_font, text_w)
    sub_lines = wrap(draw, subtitle, sub_font, text_w)
    block_h = len(title_lines) * 60 + 24 + len(sub_lines) * 38
    ty = (H - block_h) // 2
    for line in title_lines:
        draw.text((70, ty), line, font=title_font, fill=INK)
        ty += 60
    ty += 24
    for line in sub_lines:
        draw.text((70, ty), line, font=sub_font, fill=MUTED)
        ty += 38

    canvas.save(out)
    print(out, canvas.size, canvas.mode)


if __name__ == "__main__":
    main(*sys.argv[1:5])

"""신규 절세 가이드 페이지 3개의 OG 이미지를 og-image.png 베이스 위에 생성한다.
1200x630 PNG. 베이스 이미지의 우하단을 가리고 페이지별 제목/서브타이틀/도메인을 합성한다.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r'C:/Users/USER/Projects/finance-coffee-chat'
BASE = os.path.join(ROOT, 'og-image.png')
FONT_BOLD = r'C:/Windows/Fonts/NotoSansKR-Bold.ttf'
FONT_MEDIUM = r'C:/Windows/Fonts/NotoSansKR-Medium.ttf'
FONT_REGULAR = r'C:/Windows/Fonts/NotoSansKR-Regular.ttf'

PAGES = [
    {
        'slug': 'isa-guide',
        'badge': 'ISA GUIDE',
        'title': 'ISA계좌 완벽 가이드',
        'subtitle': '일반·서민·농어민형 한도 비교 + 만기 후 연금 전환',
    },
    {
        'slug': 'irp-refund-guide',
        'badge': 'IRP REFUND',
        'title': 'IRP 연말정산 환급 가이드',
        'subtitle': '한도 900만 · 총급여별 환급 최대 148.5만원',
    },
    {
        'slug': 'pension-irp-comparison',
        'badge': 'COMPARE',
        'title': '연금저축 vs IRP 차이',
        'subtitle': '가입자격·한도·중도인출 6항목 한눈에 비교',
    },
]

CARAMEL = (196, 133, 60)
ESPRESSO = (44, 24, 16)
DARK_ROAST = (61, 35, 23)
CREAM = (245, 237, 224)
WHITE = (255, 253, 249)


def render(page):
    img = Image.open(BASE).convert('RGB')
    W, H = img.size  # 1200x630
    draw = ImageDraw.Draw(img)

    pad_x = 64
    panel_x0 = pad_x
    panel_y0 = H - 280
    panel_x1 = W - pad_x
    panel_y1 = H - 50
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.rounded_rectangle(
        [panel_x0, panel_y0, panel_x1, panel_y1],
        radius=24,
        fill=(255, 253, 249, 240),
    )
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    badge_font = ImageFont.truetype(FONT_BOLD, 22)
    title_font = ImageFont.truetype(FONT_BOLD, 56)
    subtitle_font = ImageFont.truetype(FONT_MEDIUM, 26)
    domain_font = ImageFont.truetype(FONT_REGULAR, 22)

    cursor_y = panel_y0 + 32

    badge_text = page['badge']
    bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    bx0 = panel_x0 + 32
    by0 = cursor_y
    bx1 = bx0 + bw + 32
    by1 = by0 + bh + 16
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=14, fill=(196, 133, 60, 30), outline=CARAMEL, width=2)
    draw.text((bx0 + 16, by0 + 8 - bbox[1]), badge_text, font=badge_font, fill=CARAMEL)
    cursor_y = by1 + 18

    title_text = page['title']
    draw.text((panel_x0 + 32, cursor_y), title_text, font=title_font, fill=ESPRESSO)
    bbox = draw.textbbox((0, 0), title_text, font=title_font)
    cursor_y += (bbox[3] - bbox[1]) + 24

    subtitle_text = page['subtitle']
    draw.text((panel_x0 + 32, cursor_y), subtitle_text, font=subtitle_font, fill=DARK_ROAST)

    domain_text = 'financecoffeechat.com'
    bbox_d = draw.textbbox((0, 0), domain_text, font=domain_font)
    dw = bbox_d[2] - bbox_d[0]
    draw.text((panel_x1 - dw - 32, panel_y1 - (bbox_d[3] - bbox_d[1]) - 24), domain_text, font=domain_font, fill=CARAMEL)

    out_path = os.path.join(ROOT, f"og-{page['slug']}.png")
    img.save(out_path, format='PNG', optimize=True)
    print(f"saved {out_path} ({os.path.getsize(out_path) // 1024} KB)")


if __name__ == '__main__':
    for p in PAGES:
        render(p)

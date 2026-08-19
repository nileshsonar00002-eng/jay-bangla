import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_feathered_artwork():
    base_path = r'C:\Users\SANDEEP\.gemini\antigravity\brain\009499af-5ebd-4e55-b791-84284b4d9479\.user_uploaded\media_1786998912488.jpg'
    idol_img = Image.open(base_path).convert('RGB')
    iw, ih = idol_img.size

    bg_color_center = (87, 7, 4)

    # ----------------------------------------------------
    # 1. Desktop Background (2560 x 1440)
    # ----------------------------------------------------
    dw, dh = 2560, 1440
    desktop_canvas = Image.new('RGB', (dw, dh), bg_color_center)

    # Scale idol to fit nicely in the center of desktop
    scale_d = 1.65
    target_iw_d = int(iw * scale_d)
    target_ih_d = int(ih * scale_d)
    idol_d = idol_img.resize((target_iw_d, target_ih_d), Image.Resampling.LANCZOS)

    # Create smooth radial mask for feathering idol edges
    mask_d = Image.new('L', (target_iw_d, target_ih_d), 0)
    draw_mask_d = ImageDraw.Draw(mask_d)
    draw_mask_d.ellipse([140, 60, target_iw_d - 140, target_ih_d - 40], fill=255)
    mask_d = mask_d.filter(ImageFilter.GaussianBlur(75))

    idol_x_d = (dw - target_iw_d) // 2
    idol_y_d = (dh - target_ih_d) // 2 + 50
    desktop_canvas.paste(idol_d, (idol_x_d, idol_y_d), mask_d)

    # Save Desktop Background without text overlay
    desktop_canvas.save('assets/kanubai-bg.jpg', 'JPEG', quality=95)
    desktop_canvas.save('assets/images/kanubai-bg.jpg', 'JPEG', quality=95)
    print('Saved assets/kanubai-bg.jpg')

    # ----------------------------------------------------
    # 2. Mobile Background (1080 x 1920)
    # ----------------------------------------------------
    mw, mh = 1080, 1920
    mobile_canvas = Image.new('RGB', (mw, mh), bg_color_center)

    scale_m = 1.35
    target_iw_m = int(iw * scale_m)
    target_ih_m = int(ih * scale_m)
    idol_m = idol_img.resize((target_iw_m, target_ih_m), Image.Resampling.LANCZOS)

    mask_m = Image.new('L', (target_iw_m, target_ih_m), 0)
    draw_mask_m = ImageDraw.Draw(mask_m)
    draw_mask_m.ellipse([100, 40, target_iw_m - 100, target_ih_m - 30], fill=255)
    mask_m = mask_m.filter(ImageFilter.GaussianBlur(60))

    idol_x_m = (mw - target_iw_m) // 2
    idol_y_m = (mh - target_ih_m) // 2 + 110
    mobile_canvas.paste(idol_m, (idol_x_m, idol_y_m), mask_m)

    # Save Mobile Background without text overlay
    mobile_canvas.save('assets/kanubai-mobile-bg.jpg', 'JPEG', quality=95)
    mobile_canvas.save('assets/images/kanubai-mobile-bg.jpg', 'JPEG', quality=95)
    print('Saved assets/kanubai-mobile-bg.jpg')

if __name__ == '__main__':
    create_feathered_artwork()

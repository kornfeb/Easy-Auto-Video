import os
import textwrap
from PIL import Image, ImageDraw, ImageFont
import utils.crop_manager as crop_manager

# Font mapping for Mac (Extendable)
FONTS = {
    "Inter": "Arial.ttf", # Fallback for now if Inter not found
    "Sans": "Helvetica.ttc",
    "Serif": "Times.ttc",
    "Thai_Default": "Thonburi.ttc"
}

def get_font_path(font_name="Thai_Default", weight="regular"):
    # Simple font resolver for Mac
    # In a real app, we'd bundle fonts in backend/assets/fonts/
    
    # Try system fonts
    system_font_dir = "/System/Library/Fonts"
    user_font_dir = "/Library/Fonts"
    
    candidates = []
    
    if font_name in FONTS:
        candidates.append(FONTS[font_name])
    
    # Add generic fallbacks
    candidates.extend(["Thonburi.ttc", "SukhumvitSet.ttc", "Arial Unicode.ttf", "Arial.ttf"])
    
    for fname in candidates:
        for fdir in [system_font_dir, user_font_dir]:
            path = os.path.join(fdir, fname)
            if os.path.exists(path):
                return path
                
    return None # Pillow default font

def render_cover_overlay(project_path, overlay_config):
    """
    Reads 'cover_source.jpg' (or 'cover.jpg' if source missing),
    overlays text based on config,
    saves to 'cover.jpg'.
    """
    
    # 1. Load Source Image
    # We prefer cover_source.jpg if it exists, to avoid burning text into already burnt text
    source_path = os.path.join(project_path, "cover_source.jpg")
    final_path = os.path.join(project_path, "cover.jpg")
    
    if not os.path.exists(source_path):
        # Fallback: if cover.jpg exists, use it as source (and save it as source for future)
        if os.path.exists(final_path):
            import shutil
            shutil.copy2(final_path, source_path)
        else:
            return {"status": "FAIL", "error": "No cover image found to overlay text on."}
            
    try:
        img = Image.open(source_path).convert("RGBA")
    except Exception as e:
        return {"status": "FAIL", "error": f"Failed to open source image: {e}"}
    
    # Resize to standard if needed? For now, we work on actual resolution.
    W, H = img.size
    draw = ImageDraw.Draw(img)
    
    # 2. Extract Config
    title = overlay_config.get("title", "").strip()
    subtitle = overlay_config.get("subtitle", "").strip()
    position = overlay_config.get("position", "bottom") # top, center, bottom
    style_color = overlay_config.get("color", "#FFFFFF")
    style_bg = overlay_config.get("background", "none") # none, box, gradient
    
    if not title and not subtitle:
        # Just restore original
        img = img.convert("RGB")
        img.save(final_path, quality=95)
        return {"status": "OK", "message": "Overlay removed"}

    # 3. Setup Font
    font_path = get_font_path("Thai_Default")
    
    # Responsive font size based on image width
    # 1080p -> Title ~60-80px?
    base_size = int(W * 0.06) # 64px for 1080w
    
    try:
        font_title = ImageFont.truetype(font_path, base_size) if font_path else ImageFont.load_default()
        font_sub = ImageFont.truetype(font_path, int(base_size * 0.6)) if font_path else ImageFont.load_default()
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    # 4. Text Layout (Wrapping)
    # Wrap text to 80% width
    max_char_width = 20 # Rough estimate, better to measure
    # Pillow doesn't have robust wrapping for Thai built-in simply, use textwrap for now
    
    title_lines = textwrap.wrap(title, width=25) # constrained char count
    sub_lines = textwrap.wrap(subtitle, width=40)
    
    # Calculate Dimensions
    padding = int(W * 0.05)
    line_spacing = int(base_size * 0.2)
    
    # Helper to measure block
    def measure_text_block(lines, font):
        total_h = 0
        max_w = 0
        for line in lines:
            bbox = draw.textbbox((0,0), line, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            if w > max_w: max_w = w
            total_h += h + line_spacing
        return max_w, total_h
        
    t_w, t_h = measure_text_block(title_lines, font_title)
    s_w, s_h = measure_text_block(sub_lines, font_sub)
    
    total_text_h = t_h + s_h + (padding if subtitle else 0)
    
    # Position Logic
    # Safe areas: 9:16 usually has UI at bottom and top.
    # Center is safest. Bottom needs offset.
    
    if position == "center":
        start_y = (H - total_text_h) / 2
    elif position == "top":
        start_y = H * 0.15 # 15% from top
    else: # bottom (default)
        start_y = H * 0.75 # 25% from bottom (leaving space for TikTok UI)
        
    # Background
    overlay = Image.new("RGBA", img.size, (0,0,0,0))
    d_overlay = ImageDraw.Draw(overlay)
    
    content_rect = [
        (W - max(t_w, s_w))/2 - padding, 
        start_y - padding,
        (W + max(t_w, s_w))/2 + padding,
        start_y + total_text_h + padding
    ]
    
    if style_bg == "box":
        d_overlay.rectangle(content_rect, fill=(0,0,0, 160))
    elif style_bg == "gradient":
        # Draw gradient from start_y down? Or whole bottom area?
        # Let's do a subtle gradient behind text area
        # For simplicity, just a larger faded box
        grad_rect = [0, start_y - padding*2, W, start_y + total_text_h + padding*4]
        # Primitive gradient: just a rect for now to save time/complexity
        d_overlay.rectangle(grad_rect, fill=(0,0,0, 120))

    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img) # Re-get draw for final text on top

    # Draw Text
    current_y = start_y
    
    # Colors
    fill_color = style_color
    stroke_color = "black" if style_color.lower() in ['#ffffff', 'white'] else "white"
    stroke_width = 2
    
    # Title
    for line in title_lines:
        bbox = draw.textbbox((0,0), line, font=font_title)
        lw = bbox[2] - bbox[0]
        lx = (W - lw) / 2
        
        draw.text((lx, current_y), line, font=font_title, fill=fill_color, 
                  stroke_width=stroke_width, stroke_fill=stroke_color)
        current_y += (bbox[3] - bbox[1]) + line_spacing
        
    current_y += padding / 2
    
    # Subtitle
    for line in sub_lines:
        bbox = draw.textbbox((0,0), line, font=font_sub)
        lw = bbox[2] - bbox[0]
        lx = (W - lw) / 2
        
        draw.text((lx, current_y), line, font=font_sub, fill=fill_color,
                  stroke_width=stroke_width, stroke_fill=stroke_color)
        current_y += (bbox[3] - bbox[1]) + line_spacing
        
    # Save
    img = img.convert("RGB")
    img.save(final_path, quality=95)
    # REVERTED: Do NOT sync final cover back to input gallery as 999.jpg
    # try:
    #     import shutil
    #     input_dir = os.path.join(project_path, "input")
    #     for f in os.listdir(input_dir):
    #         if f.startswith("999."):
    #             try: os.remove(os.path.join(input_dir, f))
    #             except: pass
    #     shutil.copy2(final_path, os.path.join(input_dir, "999.jpg"))
    # except: pass
    
    return {"status": "OK", "file": "cover.jpg"}

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def calculate_smart_crop(img_w, img_h, roi, target_ratio=0.5625):
    """
    Calculates the best crop box for a target ratio (default 9:16)
    ensuring the ROI (normalized 0-1000) is preserved.
    """
    # Convert normalized ROI to pixel coordinates
    ry1 = roi['ymin'] * img_h / 1000
    rx1 = roi['xmin'] * img_h / 1000 # Wait, vision usually uses height for both if normalized? 
                                     # Actually Gemini uses 0-1000 relative to H and W.
    rx1 = roi['xmin'] * img_w / 1000
    ry2 = roi['ymax'] * img_h / 1000
    rx2 = roi['xmax'] * img_w / 1000
    
    roi_w = rx2 - rx1
    roi_h = ry2 - ry1
    roi_cx = rx1 + roi_w / 2
    roi_cy = ry1 + roi_h / 2
    
    # Target Box Dimensions
    if (img_w / img_h) > target_ratio:
        # Original is wider than 9:16 (Landscape)
        # We MUST crop horizontal sides
        crop_h = img_h
        crop_w = int(crop_h * target_ratio)
    else:
        # Original is taller than 9:16
        # We MUST crop vertical sides
        crop_w = img_w
        crop_h = int(crop_w / target_ratio)
        
    # Center the crop box on the ROI's center
    left = roi_cx - crop_w / 2
    top = roi_cy - crop_h / 2
    
    # Boundary checks (Clamping)
    if left < 0: left = 0
    if top < 0: top = 0
    if left + crop_w > img_w: left = img_w - crop_w
    if top + crop_h > img_h: top = img_h - crop_h
    
    return (int(left), int(top), int(left + crop_w), int(top + crop_h))

def normalize_image_to_916(img, bg_color="#000000", roi_data=None):
    """
    Normalizes an image to 9:16 (1080x1920) based on specific rules:
    - If roi_data is provided: Perform AI Smart Crop.
    - If Landscape/Square (No ROI): Pad to fit.
    - If Portrait (No ROI): Minor crop if close, else pad.
    """
    target_w, target_h = 1080, 1920
    target_ratio = target_w / target_h # 0.5625
    img_ratio = img.width / img.height
    
    # 1. AI Smart Crop (If ROI is available and reliable)
    if roi_data and roi_data.get('roi'):
        roi = roi_data['roi']
        crop_box = calculate_smart_crop(img.width, img.height, roi, target_ratio)
        img = img.crop(crop_box)
        return img.resize((target_w, target_h), Image.LANCZOS)

    # 2. Heuristic fallback (Previous logic)
    if abs(img_ratio - target_ratio) < 0.01:
        return img.resize((target_w, target_h), Image.LANCZOS)
    
    if img_ratio > target_ratio:
        return resize_image_logic(img, target_w, target_h, mode="fit", bg_color=bg_color)
    
    if img_ratio < target_ratio:
        loss_percentage = (target_ratio - img_ratio) / target_ratio
        if loss_percentage < 0.15:
            return resize_image_logic(img, target_w, target_h, mode="fill", bg_color=bg_color)
        else:
            return resize_image_logic(img, target_w, target_h, mode="fit", bg_color=bg_color)

    return resize_image_logic(img, target_w, target_h, mode="fit", bg_color=bg_color)

def resize_image_logic(img, target_width, target_height, mode="fit", bg_color="#000000"):
    """
    Core logic for resizing a single PIL Image.
    mode: 'fit' (pad with color), 'fill' (crop center)
    """
    original_ratio = img.width / img.height
    target_ratio = target_width / target_height
    
    bg_rgb = hex_to_rgb(bg_color)
    new_img = Image.new("RGB", (target_width, target_height), bg_rgb)
    
    if mode == "fill":
        if original_ratio > target_ratio:
            scale_height = target_height
            scale_width = int(scale_height * original_ratio)
        else:
            scale_width = target_width
            scale_height = int(scale_width / original_ratio)
            
        img_resized = img.resize((scale_width, scale_height), Image.LANCZOS)
        left = (scale_width - target_width) // 2
        top = (scale_height - target_height) // 2
        new_img.paste(img_resized, (-left, -top))
    else:
        if original_ratio > target_ratio:
            scale_width = target_width
            scale_height = int(scale_width / original_ratio)
        else:
            scale_height = target_height
            scale_width = int(scale_height * original_ratio)
            
        img_resized = img.resize((scale_width, scale_height), Image.LANCZOS)
        x = (target_width - scale_width) // 2
        y = (target_height - scale_height) // 2
        new_img.paste(img_resized, (x, y))
        
    return new_img

def normalize_video_to_916(input_path, output_path, bg_color="#000000"):
    """
    Uses FFmpeg to normalize video to 9:16 (1080x1920).
    Follows preservation rules:
    - Landscape: fit + pad
    - Portrait: scale + minor crop if needed
    """
    # Hex to FFmpeg color (e.g., #FFA500 -> 0xFFA500)
    color = bg_color.replace("#", "0x")
    
    # FFmpeg filter complex:
    # 1. Scale to fit height if portrait, or width if landscape
    # 2. Pad to 1080:1920
    # For simplicity and robust rules, we use 'force_original_aspect_ratio=decrease' for padding
    
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:{color}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "copy",
        output_path
    ]
    
    import subprocess
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except Exception as e:
        print(f"FFmpeg normalization failed: {e}")
        return False

def normalize_asset(project_path, filename, bg_color="#000000", ai_smart_crop=False):
    """
    High-level dispatcher to normalize any asset to 9:16.
    """
    input_dir = os.path.join(project_path, "input")
    file_path = os.path.join(input_dir, filename)
    
    if not os.path.exists(file_path):
        return False
        
    ext = filename.lower().split('.')[-1]
    
    roi_data = None
    if ai_smart_crop:
        from .ai_detector import detect_roi
        # For videos, we analyze a middle frame
        if ext in ['mp4', 'webm']:
            # For simplicity, extract frame 0 for now as 'middle' is expensive to find accurately without full probe
            # But the requirement says "middle frame". Let's try to get a frame at t=1s
            temp_frame = file_path + ".frame.jpg"
            import subprocess
            subprocess.run(["ffmpeg", "-y", "-i", file_path, "-ss", "00:00:01", "-vframes", "1", temp_frame], capture_output=True)
            if os.path.exists(temp_frame):
                roi_data = detect_roi(temp_frame)
                os.remove(temp_frame)
        else:
            roi_data = detect_roi(file_path)

    if ext in ['jpg', 'jpeg', 'png', 'webp']:
        try:
            with Image.open(file_path) as img:
                img = img.convert("RGB")
                processed = normalize_image_to_916(img, bg_color, roi_data)
                processed.save(file_path, quality=95)
                
                # Save Metadata
                if roi_data and roi_data.get('roi'):
                    crop_box = calculate_smart_crop(img.width, img.height, roi_data['roi'])
                    crop_manager.save_crop(
                        project_path, filename, 
                        roi_data['roi'], 
                        crop_box, 
                        confidence=roi_data.get('confidence', 1.0),
                        type=roi_data.get('type', 'unknown')
                    )
            return True
        except:
            return False
            
    elif ext in ['mp4', 'webm']:
        temp_path = file_path + ".tmp.mp4"
        
        # If we have ROI, we apply smart crop in FFmpeg
        crop_filter = ""
        if roi_data and roi_data.get('roi'):
            # This is complex in FFmpeg, we might just use the PIL logic to get box and then use 'crop' filter
            # Let's get dimensions first
            import subprocess
            probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", file_path], capture_output=True, text=True)
            try:
                w, h = map(int, probe.stdout.strip().split('x'))
                box = calculate_smart_crop(w, h, roi_data['roi'])
                # box is (x1, y1, x2, y2) -> crop=w:h:x:y
                cw = box[2] - box[0]
                ch = box[3] - box[1]
                crop_filter = f"crop={cw}:{ch}:{box[0]}:{box[1]},"
            except:
                pass

        color = bg_color.replace("#", "0x")
        cmd = [
            "ffmpeg", "-y",
            "-i", file_path,
            "-vf", f"{crop_filter}scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:{color}",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "copy",
            temp_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            os.replace(temp_path, file_path)
            
            # Save Metadata
            if roi_data and roi_data.get('roi'):
                crop_manager.save_crop(
                    project_path, filename, 
                    roi_data['roi'], 
                    box, 
                    confidence=roi_data.get('confidence', 1.0),
                    type=roi_data.get('type', 'unknown')
                )
            return True
        except Exception as e:
            print(f"FFmpeg normalization failed: {e}")
            return False
    return False

def process_batch_images(project_path, image_names, config):
    """
    Batch process images: resize, crop, pad, or normalize.
    """
    input_dir = os.path.join(project_path, "input")
    results = []
    
    target_w = int(config.get("width", 1080))
    target_h = int(config.get("height", 1920))
    mode = config.get("mode", "fit")
    bg_color = config.get("bg_color", "#000000")
    
    for name in image_names:
        img_path = os.path.join(input_dir, name)
        if not os.path.exists(img_path):
            results.append({"name": name, "status": "FAIL", "error": "File not found"})
            continue
            
        try:
            if mode == "normalize":
                ai_smart = config.get("ai_smart_crop", False)
                success = normalize_asset(project_path, name, bg_color, ai_smart_crop=ai_smart)
                if success:
                    results.append({"name": name, "status": "OK"})
                else:
                    results.append({"name": name, "status": "FAIL", "error": "Normalization failed"})
            else:
                # Standard Resize/Crop
                with Image.open(img_path) as img:
                    img = img.convert("RGB")
                    processed_img = resize_image_logic(
                        img, target_w, target_h, mode, bg_color
                    )
                    processed_img.save(img_path, quality=95)
                    results.append({"name": name, "status": "OK"})
                
        except Exception as e:
            results.append({"name": name, "status": "FAIL", "error": str(e)})
            
    return results

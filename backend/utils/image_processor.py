import os
import textwrap
from PIL import Image, ImageDraw, ImageFont

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
    
    return {"status": "OK", "file": "cover.jpg"}

from PIL import Image, ImageDraw

def add_rounded_corners(img, radius):
    """Add rounded corners to an image"""
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    img.putalpha(mask)
    return img

img = Image.open("frontend/public/images/serenity.png").convert("RGBA")

sizes = [256, 64, 32, 16]
frames = []
for s in sizes:
    resized = img.resize((s, s), Image.LANCZOS)
    # Use ~25% of size as radius for rounded corners
    radius = max(1, s // 4)
    rounded = add_rounded_corners(resized, radius)
    frames.append(rounded)

frames[0].save(
    "frontend/public/favicon.ico",
    format="ICO",
    append_images=frames[1:],
    sizes=[(s, s) for s in sizes]
)
frames[2].save("frontend/public/favicon-32.png", "PNG")
frames[0].save("frontend/public/favicon-256.png", "PNG")
print("Done")

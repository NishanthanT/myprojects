import os
from PIL import Image, ImageDraw

base_dir = "cat_dog_dataset"
dirs = [
    f"{base_dir}/train/cats",
    f"{base_dir}/train/dogs",
    f"{base_dir}/test/cats",
    f"{base_dir}/test/dogs",
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

def create_image(filename, text, color):
    img = Image.new('RGB', (160, 160), color=color)
    d = ImageDraw.Draw(img)
    d.text((60, 70), text, fill=(255, 255, 255))
    img.save(filename)

print("Generating 10 Train Cat Images...")
for i in range(10):
    create_image(f"{base_dir}/train/cats/cat_{i}.jpg", f"CAT {i}", (50, 150, 200))

print("Generating 10 Train Dog Images...")
for i in range(10):
    create_image(f"{base_dir}/train/dogs/dog_{i}.jpg", f"DOG {i}", (200, 100, 50))

print("Generating 2 Test Cat Images...")
for i in range(2):
    create_image(f"{base_dir}/test/cats/cat_{i}.jpg", f"CAT TEST {i}", (50, 150, 200))

print("Generating 2 Test Dog Images...")
for i in range(2):
    create_image(f"{base_dir}/test/dogs/dog_{i}.jpg", f"DOG TEST {i}", (200, 100, 50))

print("Dummy dataset successfully generated!")

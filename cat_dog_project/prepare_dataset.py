import os
import requests

base_dir = "cat_dog_dataset"
dirs = [
    f"{base_dir}/train/cats",
    f"{base_dir}/train/dogs",
    f"{base_dir}/test/cats",
    f"{base_dir}/test/dogs",
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

def download_cat(filename):
    try:
        res = requests.get("https://api.thecatapi.com/v1/images/search", timeout=10)
        url = res.json()[0]["url"]
        img_data = requests.get(url, timeout=10).content
        with open(filename, 'wb') as handler:
            handler.write(img_data)
    except Exception as e:
        print(f"Error downloading cat {filename}: {e}")

def download_dog(filename):
    try:
        res = requests.get("https://dog.ceo/api/breeds/image/random", timeout=10)
        url = res.json()["message"]
        img_data = requests.get(url, timeout=10).content
        with open(filename, 'wb') as handler:
            handler.write(img_data)
    except Exception as e:
        print(f"Error downloading dog {filename}: {e}")

print("Downloading 10 Train Cat Images...")
for i in range(10):
    download_cat(f"{base_dir}/train/cats/cat_{i}.jpg")

print("Downloading 10 Train Dog Images...")
for i in range(10):
    download_dog(f"{base_dir}/train/dogs/dog_{i}.jpg")

print("Downloading 2 Test Cat Images...")
for i in range(2):
    download_cat(f"{base_dir}/test/cats/cat_{i}.jpg")

print("Downloading 2 Test Dog Images...")
for i in range(2):
    download_dog(f"{base_dir}/test/dogs/dog_{i}.jpg")

print("Dataset successfully downloaded and organized!")

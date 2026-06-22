import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
import os

# Set paths
base_dir = "cat_dog_dataset"
train_dir = os.path.join(base_dir, 'train')
test_dir = os.path.join(base_dir, 'test')

# Image properties
IMG_SIZE = (160, 160)
BATCH_SIZE = 4

print("\n--- 1. Loading Data ---")
train_dataset = tf.keras.utils.image_dataset_from_directory(
    train_dir,
    shuffle=True,
    batch_size=BATCH_SIZE,
    image_size=IMG_SIZE
)

test_dataset = tf.keras.utils.image_dataset_from_directory(
    test_dir,
    shuffle=False,
    batch_size=BATCH_SIZE,
    image_size=IMG_SIZE
)

class_names = train_dataset.class_names
print("Classes:", class_names)

# Optimize datasets for performance
AUTOTUNE = tf.data.AUTOTUNE
train_dataset = train_dataset.cache().prefetch(buffer_size=AUTOTUNE)
test_dataset = test_dataset.cache().prefetch(buffer_size=AUTOTUNE)

print("\n--- 2. Building the Model ---")
# Data Augmentation layer (very important since we only have 20 images)
data_augmentation = tf.keras.Sequential([
  layers.RandomFlip('horizontal'),
  layers.RandomRotation(0.2),
  layers.RandomZoom(0.2),
])

# Use MobileNetV2 as the base model
preprocess_input = tf.keras.applications.mobilenet_v2.preprocess_input
base_model = MobileNetV2(input_shape=IMG_SIZE + (3,),
                         include_top=False,
                         weights='imagenet')

# Freeze the base model (we don't want to change the pre-trained weights)
base_model.trainable = False

# Build final model
inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
x = data_augmentation(inputs)
x = preprocess_input(x)
x = base_model(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.2)(x)
outputs = layers.Dense(1, activation='sigmoid')(x)

model = tf.keras.Model(inputs, outputs)

model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
              loss=tf.keras.losses.BinaryCrossentropy(),
              metrics=['accuracy'])

model.summary()

print("\n--- 3. Training the Model ---")
# We'll train for 10 epochs
history = model.fit(train_dataset, epochs=10, validation_data=test_dataset)

print("\n--- 4. Testing the Model ---")
loss, accuracy = model.evaluate(test_dataset)
print(f"Test Accuracy: {accuracy*100:.2f}%")

print("\n--- 5. Making Predictions on Test Images ---")
import numpy as np

# Predict on a batch of test images
for images, labels in test_dataset.take(1):
    predictions = model.predict(images)
    for i in range(len(predictions)):
        pred_val = predictions[i][0]
        actual_val = float(labels[i])
        predicted_class = "dogs" if pred_val > 0.5 else "cats"
        actual_class = "dogs" if actual_val > 0.5 else "cats"
        print(f"Actual: {actual_class}  |  Predicted: {predicted_class}  |  Confidence: {pred_val:.3f}")

print("\nTraining and Testing Complete!")

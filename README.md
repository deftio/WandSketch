# 🪄 Wand Tracker

A magical web application that uses computer vision and machine learning to track wand movements and recognize spell patterns in real-time.

Inspired by a visit to Hogsmeade :) 

## ✨ Features

### 🎯 Real-time Wand Tracking
- **Advanced Hand Detection**: Uses MediaPipe ML models to detect hand positions with high accuracy
- **Multi-finger Tracking**: Tracks multiple finger positions to find the best "wand tip"
- **Signal Processing**: Applies smoothing filters and noise reduction for stable tracking
- **Confidence Scoring**: Shows tracking quality percentage in real-time

### 🔮 Spell Recognition
- **Pattern Learning**: Learn custom spell patterns by drawing with your wand
- **Unistroke Recognition**: Advanced pattern matching using geometric normalization
- **Spell Library**: Save and manage multiple spells with persistent storage
- **Recognition Feedback**: Visual notifications when spells are detected

### 📱 Responsive Design
- **Mobile Optimized**: Touch-friendly interface for phones and tablets
- **Desktop Support**: Full-featured experience on larger screens
- **Adaptive Layout**: Automatically adjusts to screen size and orientation

### ⚙️ Customizable Settings
- **Camera Controls**: Show/hide video feed, flip horizontal/vertical
- **Trail Customization**: Adjust trail length (1-8 seconds) and opacity
- **Sensitivity Tuning**: Fine-tune detection sensitivity (0.1-1.0) - your mileage may vary
- **Persistent Storage**: All settings and spells saved automatically

## 🚀 Getting Started

### 1. Camera Permission
When you first open the app, you'll be prompted to allow camera access. This is required for wand tracking.

### 2. Basic Tracking
- Hold your hand up to the camera with your index finger extended (like holding a wand)
- Move your finger to see the magical trail appear on screen
- The trail will fade over time based on your trail length setting

### 3. Learning Spells

#### To learn a new spell:
1. Switch to the **Settings** tab at the bottom
2. Enter a spell name (e.g., "Lumos", "Expelliarmus")
3. Click **Learn** to start recording
4. Draw the spell pattern with your wand
5. Click **Save Spell** when finished

#### Tips for good spell patterns:
- Make distinctive shapes (circles, zigzags, letters)
- Draw at moderate speed for best recognition
- Keep patterns simple but unique
- Practice the same pattern consistently

### 4. Casting Spells
Once you've learned spells, simply draw the pattern with your wand. When recognized, the spell name will appear at the bottom of the screen for 8 seconds.

## 🎮 Controls

### Tracker Tab
- **Clear Trail**: Remove all current trail points
- **Trail Length**: How long trails persist (1-8 seconds)
- **Sensitivity**: Detection sensitivity (higher = more responsive)

### Settings Tab

#### Camera Settings
- **Show Video Feed**: Toggle webcam preview visibility
- **Flip Horizontal**: Mirror the video feed horizontally
- **Flip Vertical**: Flip the video feed vertically

#### Spell Learning
- **Spell Name**: Enter name for new spell
- **Learn/Save**: Start learning or save current pattern
- **Learned Spells**: View and manage saved spells

## 📊 Status Indicators

- **Camera**: Green when webcam is active
- **ML Tracking**: Green when MediaPipe is running
- **Wand XX%**: Shows tracking confidence percentage

## 💡 Tips for Best Performance

### Lighting
- Use good lighting - avoid backlighting
- Avoid harsh shadows on your hands
- Natural daylight works best

### Hand Position
- Keep your hand clearly visible to the camera
- Extend your index finger like holding a wand
- Avoid rapid movements for better tracking

### Environment
- Use a contrasting background (your hand vs background)
- Minimize distracting objects in camera view
- Keep camera stable if possible

## 🔧 Troubleshooting

### Poor Tracking
- Check lighting conditions
- Ensure hand is clearly visible
- Try adjusting sensitivity settings
- Make sure camera has clear view of your hand

### Spells Not Recognized
- Practice drawing patterns consistently
- Ensure patterns are distinctive
- Try re-learning spells if recognition is poor
- Check that you're drawing at moderate speed

### Camera Issues
- Refresh the page and re-grant camera permission
- Check that no other apps are using the camera
- Ensure camera is not blocked or covered

## 🧙‍♂️ Spell Suggestions

Try learning these classic Harry Potter spells:

- **Lumos**: Simple upward line
- **Alohomora**: Key-turning circle
- **Expelliarmus**: Quick zigzag
- **Wingardium Leviosa**: Gentle wave motion
- **Expecto Patronum**: Spiral pattern

## 🛠️ Technical Details

Built with modern web technologies:
- **React + TypeScript**: Frontend framework with type safety
- **MediaPipe**: Google's ML hand tracking models
- **Canvas API**: Real-time drawing and trail rendering
- **Tailwind CSS**: Responsive styling and design system
- **Local Storage**: Persistent data storage

The app runs entirely in your browser with no server required for core functionality.
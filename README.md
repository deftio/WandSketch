# 🪄 Spell Caster

A magical web application that uses computer vision and machine learning to track wand movements and recognize spell patterns in real-time.

**✨ Live Demo**: Available on [GitHub Pages](https://your-username.github.io/your-repo-name/)

Inspired by a visit to Hogsmeade :) 

## ✨ Features

### 🎯 Real-time Wand Tracking
- **Advanced Hand Detection**: Uses MediaPipe ML models to detect hand positions with high accuracy
- **Multi-finger Tracking**: Tracks multiple finger positions to find the best "wand tip"
- **Signal Processing**: Applies smoothing filters and noise reduction for stable tracking
- **Visual Trail Rendering**: Beautiful purple trails that fade over time (1-20 seconds)
- **Pause & Freeze**: Pause tracking to freeze trails on screen

### 🔮 Spell Recognition
- **Pattern Learning**: Learn custom spell patterns by drawing with your wand (3 repetitions for accuracy)
- **Harry Potter Spells**: Pre-load 15 classic Harry Potter spells with traditional wand movements
- **Advanced Recognition**: Pattern matching using geometric normalization and vector comparison
- **Spell Library**: Save and manage multiple spells with persistent storage
- **Recognition Feedback**: Visual notifications when spells are detected
- **Configurable Memory**: Adjust how many tracking points are analyzed for spell recognition

### 📱 Responsive Design
- **Mobile Optimized**: Collapsible controls and touch-friendly interface for phones and tablets
- **Desktop Support**: Full-featured experience on larger screens
- **Adaptive Layout**: Automatically adjusts to screen size and orientation
- **Clean Interface**: Minimal, distraction-free tracking area

### ⚙️ Customizable Settings
- **Camera Controls**: Show/hide video feed (defaults to off), flip horizontal/vertical
- **Trail Customization**: Adjust trail length (1-20 seconds, default 6s) and persistence
- **Sensitivity Tuning**: Fine-tune detection sensitivity (0.1-1.0, default 0.8)
- **Smoothing Controls**: Reduce jitter with adjustable smoothing (1-10 points, default 3)
- **Spell Memory Length**: Control pattern recognition sensitivity (10-50 points, default 20)
- **Persistent Storage**: All settings and spells saved automatically

## 🚀 Getting Started

### 1. Camera Permission
When you first open the app, you'll be prompted to allow camera access. This is required for wand tracking.

### 2. Basic Tracking
- Hold your hand up to the camera with your index finger extended (like holding a wand)
- Move your finger to see the magical purple trail appear on screen
- Use the **Pause** button in the top status bar to freeze trails on screen
- The trail will fade over time based on your trail length setting

### 3. Learning Spells

#### Option 1: Load Harry Potter Spells
1. Switch to the **Spells** tab at the bottom
2. Click **"Activate Harry Potter Spells"** to load 15 pre-configured spells
3. Enable the **Spells** toggle in the top-left if it's not already on
4. Try casting: Lumos (up stroke), Alohomora (key turn), Expelliarmus (flick), etc.

#### Option 2: Learn Custom Spells
1. Switch to the **Spells** tab at the bottom
2. Enter a spell name (e.g., "Lumos", "My Custom Spell")
3. Click **Learn Spell** to start recording
4. Draw the spell pattern with your wand 3 times consistently
5. Click **Capture Pattern** after each drawing
6. The spell will be automatically saved after 3 successful patterns

#### Tips for good spell patterns:
- Make distinctive shapes (circles, zigzags, letters)
- Draw at moderate speed for best recognition
- Keep patterns simple but unique
- Practice the same pattern consistently for all 3 repetitions

### 4. Casting Spells
- Ensure the **Spells** toggle in the top-left is enabled
- Draw learned patterns with your wand
- When recognized, the spell name will appear at the bottom of the screen for 2 seconds

## 🎮 Controls

### Main Interface
- **Top-Left**: Spells toggle (enable/disable spell recognition)
- **Top-Center**: "Spell Caster" title
- **Top-Right**: Status indicators (Camera, Tracking, Wand) and Pause button
- **Bottom**: Tabbed interface with Tracker, Spells, and Settings

### Tracker Tab
- Clean, minimal interface focused on tracking
- No controls - just watch the magic happen!

### Spells Tab
- **Learn New Spell**: Enter name and record 3 consistent patterns
- **Harry Potter Spells**: Load pre-configured spell library
- **Learned Spells**: View and delete saved spells
- **Debug Information**: View tracking details when enabled

### Settings Tab

#### Camera Settings
- **Show Video Feed**: Toggle webcam preview visibility (defaults to off)
- **Flip Horizontal**: Mirror the video feed horizontally (useful for front-facing cameras)
- **Flip Vertical**: Flip the video feed vertically

#### Tracking Settings
- **Trail**: How long trails persist on screen (1-20 seconds, default 6s)
- **Sensitivity**: Detection sensitivity - higher = more responsive (0.1-1.0, default 0.8)
- **Smooth**: Reduce tracking jitter (1-10 points, default 3)
- **Spell Memory Length**: How many recent points analyzed for spell recognition (10-50, default 20)
- **Clear Trail**: Remove all current trail points from the screen

## 📊 Status Indicators

- **Camera**: Green when webcam is active and accessible
- **Tracking**: Green when MediaPipe hand detection is running, shows "Paused" when frozen
- **Wand**: Green when hand/wand is detected and being tracked
- **Pause Button**: Freeze/resume tracking (trails stay visible when paused)

## 💡 Tips for Best Performance

### Lighting
- Use good lighting - avoid backlighting
- Avoid harsh shadows on your hands
- Natural daylight works best
- Indoor lighting should be bright and even

### Hand Position
- Keep your hand clearly visible to the camera
- Extend your index finger like holding a wand
- Avoid rapid movements for better tracking
- Use deliberate, smooth motions for spell casting

### Environment
- Use a contrasting background (your hand vs background)
- Minimize distracting objects in camera view
- Keep camera stable if possible
- Ensure good internet connection for initial MediaPipe model loading

### Spell Recognition
- Enable the Spells toggle in the top-left corner
- Draw patterns at moderate speed (not too fast, not too slow)
- Be consistent with learned patterns
- Adjust "Spell Memory Length" in settings if recognition is too sensitive/loose

## 🔧 Troubleshooting

### Poor Tracking
- Check lighting conditions
- Ensure hand is clearly visible to camera
- Try adjusting sensitivity in Settings tab
- Make sure camera has clear view of your hand
- Check if other apps are using the camera

### Spells Not Recognized
- Ensure Spells toggle is enabled (top-left)
- Practice drawing patterns consistently
- Try re-learning spells if recognition is poor
- Adjust "Spell Memory Length" in Settings (lower = more responsive, higher = more stable)
- Check that you're drawing at moderate speed

### Camera Issues
- Refresh the page and re-grant camera permission
- Check that no other apps are using the camera
- Ensure camera is not blocked or covered
- Try using a different browser if issues persist

### Performance Issues
- Close other browser tabs using camera/microphone
- Ensure good internet connection for initial loading
- Try reducing trail length and smoothing settings
- Use a modern browser with WebGL support

## 🧙‍♂️ Pre-loaded Harry Potter Spells

The app includes 15 classic spells with traditional wand movements:

- **Lumos**: Simple upward stroke (light spell)
- **Nox**: Simple downward stroke (extinguish light)
- **Alohomora**: Key-turning motion (unlocking spell)
- **Accio**: Pulling gesture (summoning charm)
- **Expelliarmus**: Quick flick away (disarming spell)
- **Wingardium Leviosa**: Swish and flick (levitation charm)
- **Stupefy**: Straight thrust (stunning spell)
- **Petrificus Totalus**: Binding cross pattern (full body-bind)
- **Incendio**: Flame flick (fire spell)
- **Aguamenti**: Water wave motion (water spell)
- **Expecto Patronum**: Protective circle (patronus charm)
- **Riddikulus**: Laugh gesture (boggart banishing)
- **Flipendo**: Push force (knockback jinx)
- **Impedimenta**: Blocking wall (impediment jinx)
- **Rictusempra**: Tickle wiggle (tickling charm)

## 🛠️ Technical Details

Built with modern web technologies:
- **React + TypeScript**: Frontend framework with type safety
- **MediaPipe**: Google's ML hand tracking models (loaded via CDN)
- **Canvas API**: Real-time drawing and trail rendering with opacity effects
- **Tailwind CSS + shadcn/ui**: Modern component library and responsive design
- **Vite**: Fast development and build tooling
- **Local Storage**: Persistent data storage for settings and learned spells
- **GitHub Pages**: Static hosting and deployment

### Key Features:
- **Real-time Performance**: 60fps tracking and rendering
- **Advanced Pattern Recognition**: Geometric normalization and similarity scoring
- **Progressive Web App**: Works offline after initial load
- **Cross-platform**: Runs on desktop, tablet, and mobile browsers
- **No Server Required**: Fully client-side application

## 🚀 Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions:
- **Production URL**: Available at your GitHub Pages domain
- **Auto-deployment**: Pushes to main branch trigger automatic builds
- **Optimized Assets**: Vite production build with asset optimization
- **Fast Loading**: Optimized bundle size and efficient caching

## 📄 License

This project is for educational and entertainment purposes. MediaPipe is used under Google's Apache 2.0 license.

---

*Cast responsibly and may your spells be ever in your favor!* ✨🪄
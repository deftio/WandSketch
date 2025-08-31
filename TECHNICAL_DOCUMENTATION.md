# 🛠️ Technical Documentation

## Architecture Overview

The Harry Potter Wand Tracker is a sophisticated web application that combines computer vision, machine learning, and signal processing to create an interactive magical experience.

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components + Tailwind CSS
- **Computer Vision**: Google MediaPipe Hands ML model
- **Signal Processing**: Custom algorithms for noise reduction and smoothing
- **Pattern Recognition**: Geometric unistroke recognition system
- **Storage**: Browser localStorage for persistence

## Core Components

### 1. Computer Vision Pipeline

#### MediaPipe Integration
```typescript
// MediaPipe Hands configuration
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: sensitivity,
  minTrackingConfidence: sensitivity
});
```

**Key Features:**
- Real-time hand landmark detection (21 points per hand)
- Confidence scoring for each landmark
- Support for multiple hands (configured for single hand)
- WebGL acceleration for performance

#### Hand Landmark Mapping
```
MediaPipe Hand Landmarks:
0: Wrist
4: Thumb tip
8: Index finger tip (primary wand point)
12: Middle finger tip
16: Ring finger tip  
20: Pinky tip
```

### 2. Signal Processing System

#### WandDetector Class
The `WandDetector` class implements advanced signal processing for stable tracking:

```typescript
class WandDetector {
  private smoothProcessor: SignalProcessor;
  private lastValidPoint: number[] | null;
  private confidenceThreshold: number;
}
```

**Signal Processing Features:**

##### Moving Average Smoothing
```typescript
smooth(point: number[]): number[] {
  this.history.push(point);
  if (this.history.length > this.maxHistory) {
    this.history.shift();
  }
  // Calculate weighted average of recent points
}
```

##### Velocity-Based Outlier Detection
```typescript
isValidMovement(newPoint: number[], lastPoint: number[], maxVelocity = 200): boolean {
  const distance = Math.sqrt(
    (newPoint[0] - lastPoint[0]) ** 2 + (newPoint[1] - lastPoint[1]) ** 2
  );
  return distance <= maxVelocity;
}
```

**Benefits:**
- Eliminates tracking jitter and noise
- Prevents sudden position jumps from detection errors
- Maintains smooth, natural wand movement
- Adaptive confidence thresholding

#### Multi-Finger Tracking Strategy
```typescript
getWandTip(landmarks: any, handedness: string): { point: number[] | null; confidence: number } {
  const fingerTips = [
    landmarks[8],  // Index finger tip (preferred)
    landmarks[12], // Middle finger tip
    landmarks[16], // Ring finger tip
    landmarks[20]  // Pinky tip
  ];
  
  // Select best finger based on visibility and handedness
}
```

### 3. Spell Recognition System

#### Unistroke Recognition Algorithm

The spell recognition uses a sophisticated unistroke algorithm adapted from academic research:

##### Pattern Normalization Pipeline
1. **Resampling**: Convert to fixed 64-point representation
2. **Rotation**: Align to indicative angle (first point to centroid)
3. **Scaling**: Normalize to unit square (250x250)
4. **Translation**: Center at origin

```typescript
private normalizePoints(points: number[][]): number[][] {
  const resampled = this.resample(points, 64);
  const rotated = this.rotateToZero(resampled);
  const scaled = this.scaleToSquare(rotated);
  return this.translateToOrigin(scaled);
}
```

##### Recognition Process
```typescript
recognize(points: number[][]): { name: string; score: number } | null {
  const normalized = this.normalizePoints(points);
  
  for (const [name, template] of Object.entries(this.templates)) {
    const score = this.calculateSimilarity(normalized, template);
    if (score > bestMatch.score && score > 0.7) {
      bestMatch = { name, score };
    }
  }
}
```

**Similarity Calculation:**
- Point-to-point Euclidean distance
- Normalized by path diagonal
- Threshold of 0.7 for recognition confidence

### 4. Trail Rendering System

#### Canvas-Based Drawing
```typescript
class TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  age: number;
  
  getOpacity(trailLength: number): number {
    return Math.max(0, 1 - (this.age / trailLength));
  }
}
```

**Rendering Features:**
- Temporal opacity decay based on age
- Smooth line interpolation between points
- Hardware-accelerated canvas rendering
- Configurable trail persistence (1-8 seconds)

#### Drawing Loop
```typescript
const drawTrail = useCallback((ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  for (let i = 1; i < trailPointsRef.current.length; i++) {
    const opacity = point.getOpacity(trailLengthMs);
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = `hsla(210, 20%, 85%, ${opacity})`;
    // Draw line segment
  }
});
```

### 5. State Management

#### React State Architecture
```typescript
// Camera and ML state
const [cameraStatus, setCameraStatus] = useState(false);
const [mlStatus, setMlStatus] = useState(false);
const [wandStatus, setWandStatus] = useState(false);

// User preferences  
const [isVideoVisible, setIsVideoVisible] = useState(true);
const [flipHorizontal, setFlipHorizontal] = useState(true);
const [sensitivity, setSensitivity] = useState([0.8]);

// Spell system
const [learnedSpells, setLearnedSpells] = useState<{[key: string]: number[][]}>({});
const [detectedSpell, setDetectedSpell] = useState("");
```

#### Persistent Storage
```typescript
const saveSettings = useCallback(() => {
  const settings = {
    isVideoVisible,
    flipHorizontal,
    flipVertical,
    trailLength: trailLength[0],
    sensitivity: sensitivity[0]
  };
  localStorage.setItem('wandTracker-settings', JSON.stringify(settings));
  localStorage.setItem('wandTracker-spells', JSON.stringify(learnedSpells));
}, [/* dependencies */]);
```

### 6. Performance Optimizations

#### Rendering Performance
- **RequestAnimationFrame**: Smooth 60fps trail rendering
- **Canvas Optimization**: Minimal clear/redraw operations
- **Memory Management**: Automatic cleanup of old trail points

#### ML Performance
- **Single Hand Mode**: Reduces computational overhead
- **Adaptive Confidence**: Balances accuracy vs performance
- **WebGL Acceleration**: Hardware-accelerated MediaPipe processing

#### Mobile Optimizations
```css
@media (max-width: 768px) {
  #webcamVideo {
    width: 120px !important;
    height: 90px !important;
  }
  
  .control-panel {
    padding: 12px 16px !important;
  }
}
```

### 7. Error Handling & Recovery

#### Graceful Degradation
```typescript
const initCamera = useCallback(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({...});
    setCameraStatus(true);
  } catch (error) {
    console.error('Camera initialization failed:', error);
    setCameraStatus(false);
    // Show user-friendly error message
  }
});
```

#### Automatic Recovery
- MediaPipe script loading with retry logic
- Camera permission re-request handling
- Spell recognition timeout and reset

### 8. Security Considerations

#### Privacy Protection
- **Local Processing**: All ML processing happens in browser
- **No Data Transmission**: Camera data never leaves device
- **Local Storage Only**: Settings stored locally, not transmitted

#### Camera Access
- Explicit permission request flow
- Clear privacy messaging to users
- Graceful handling of permission denial

## Development Guidelines

### Code Organization
```
client/src/pages/wand-tracker.tsx
├── Signal Processing Classes
├── React Component State
├── MediaPipe Integration
├── Canvas Rendering
├── Local Storage Management
└── UI Components
```

### Type Safety
- Strict TypeScript configuration
- Comprehensive type definitions for ML models
- Runtime type validation for localStorage data

### Performance Monitoring
- Real-time confidence scoring display
- Status indicators for system health
- Automatic performance adaptation

## Future Enhancements

### Potential Improvements
1. **Advanced ML Models**: Custom trained models for better wand detection
2. **3D Tracking**: Depth-based tracking using stereo cameras
3. **Physics Simulation**: Realistic spell effect animations
4. **Social Features**: Spell sharing and community patterns
5. **Gesture Expansion**: Multi-stroke and gesture combinations

### Scalability Considerations
- WebRTC for multiplayer spell casting
- WebAssembly for performance-critical algorithms
- Service Worker for offline functionality
- WebXR integration for AR experiences

## Browser Compatibility

### Minimum Requirements
- **WebRTC**: Camera access support
- **Canvas API**: Hardware acceleration preferred
- **Local Storage**: 5MB+ available
- **JavaScript**: ES2020+ support
- **WebGL**: For MediaPipe acceleration

### Tested Browsers
- Chrome 90+ (recommended)
- Firefox 85+
- Safari 14+
- Edge 90+

### Mobile Support
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+

## Performance Metrics

### Target Performance
- **Frame Rate**: 30-60 FPS trail rendering
- **Latency**: <50ms wand to trail delay
- **Memory**: <100MB total usage
- **Battery**: Optimized for mobile power efficiency

### Monitoring
Real-time performance indicators:
- Camera status (green/red)
- ML tracking status (green/red)  
- Wand detection confidence (percentage)
- Spell recognition accuracy
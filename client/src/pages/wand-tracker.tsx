import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Trash2, Eye, EyeOff, Settings, Wand2, RotateCcw, FlipHorizontal, FlipVertical } from "lucide-react";

// Trail point class
// Trail point class
class TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  age: number;

  constructor(x: number, y: number, timestamp: number) {
    this.x = x;
    this.y = y;
    this.timestamp = timestamp;
    this.age = 0;
  }

  update(currentTime: number, trailLength: number): boolean {
    this.age = currentTime - this.timestamp;
    return this.age < trailLength;
  }

  getOpacity(trailLength: number): number {
    return Math.max(0, 1 - (this.age / trailLength));
  }
}

// Signal processing utilities
class SignalProcessor {
  private history: number[][];
  private readonly maxHistory: number;
  
  constructor(maxHistory = 5) {
    this.history = [];
    this.maxHistory = maxHistory;
  }
  
  // Moving average smoothing
  smooth(point: number[]): number[] {
    this.history.push(point);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    const smoothed = [0, 0];
    for (const p of this.history) {
      smoothed[0] += p[0];
      smoothed[1] += p[1];
    }
    
    return [smoothed[0] / this.history.length, smoothed[1] / this.history.length];
  }
  
  // Velocity-based outlier detection
  isValidMovement(newPoint: number[], lastPoint: number[] | null, maxVelocity = 200): boolean {
    if (!lastPoint) return true;
    
    const distance = Math.sqrt(
      (newPoint[0] - lastPoint[0]) ** 2 + (newPoint[1] - lastPoint[1]) ** 2
    );
    
    return distance <= maxVelocity;
  }
  
  // Clear history
  reset() {
    this.history = [];
  }
}

// Enhanced wand tracking with multiple landmarks  
class WandDetector {
  private smoothProcessor: SignalProcessor;
  private lastValidPoint: number[] | null;
  private confidenceThreshold: number;
  
  constructor(confidenceThreshold: number = 0.7) {
    this.smoothProcessor = new SignalProcessor(3);
    this.lastValidPoint = null;
    this.confidenceThreshold = confidenceThreshold;
  }
  
  // Get best wand tip position from hand landmarks
  getWandTip(landmarks: any, handedness: string = 'Right'): { point: number[] | null; confidence: number } {
    if (!landmarks || landmarks.length === 0) {
      return { point: null, confidence: 0 };
    }
    
    // Prioritize index finger for simplicity and reliability
    const indexTip = landmarks[8]; // Index finger tip
    
    if (indexTip && indexTip.visibility !== undefined && indexTip.visibility > this.confidenceThreshold) {
      const rawPoint = [indexTip.x, indexTip.y];
      
      // Validate movement with more lenient velocity check
      if (!this.smoothProcessor.isValidMovement(rawPoint, this.lastValidPoint, 300)) {
        return { point: this.lastValidPoint, confidence: indexTip.visibility * 0.7 };
      }
      
      // Apply lighter smoothing for more responsiveness
      const smoothedPoint = this.smoothProcessor.smooth(rawPoint);
      this.lastValidPoint = smoothedPoint;
      
      return { point: smoothedPoint, confidence: indexTip.visibility };
    }
    
    // Fallback to other fingers if index finger not detected well
    const fingerTips = [landmarks[12], landmarks[16], landmarks[20]];
    
    for (const tip of fingerTips) {
      if (tip && tip.visibility !== undefined && tip.visibility > this.confidenceThreshold) {
        const rawPoint = [tip.x, tip.y];
        
        if (this.smoothProcessor.isValidMovement(rawPoint, this.lastValidPoint, 300)) {
          const smoothedPoint = this.smoothProcessor.smooth(rawPoint);
          this.lastValidPoint = smoothedPoint;
          return { point: smoothedPoint, confidence: tip.visibility };
        }
      }
    }
    
    return { point: null, confidence: 0 };
  }
  
  reset() {
    this.smoothProcessor.reset();
    this.lastValidPoint = null;
  }
}

// Unistroke recognition class for spell patterns
class UnistrokeRecognizer {
  templates: { [key: string]: number[][] };
  
  constructor() {
    this.templates = {};
  }
  
  addTemplate(name: string, points: number[][]) {
    this.templates[name] = this.normalizePoints(points);
  }
  
  recognize(points: number[][]): { name: string; score: number } | null {
    if (points.length < 5) return null;
    
    const normalized = this.normalizePoints(points);
    let bestMatch = { name: '', score: 0 };
    
    for (const [name, template] of Object.entries(this.templates)) {
      const score = this.calculateSimilarity(normalized, template);
      if (score > bestMatch.score && score > 0.7) { // Threshold for recognition
        bestMatch = { name, score };
      }
    }
    
    return bestMatch.score > 0 ? bestMatch : null;
  }
  
  private normalizePoints(points: number[][]): number[][] {
    if (points.length === 0) return [];
    
    // Resample to fixed number of points
    const resampled = this.resample(points, 64);
    
    // Rotate to indicative angle
    const rotated = this.rotateToZero(resampled);
    
    // Scale to unit square
    const scaled = this.scaleToSquare(rotated);
    
    // Translate to origin
    return this.translateToOrigin(scaled);
  }
  
  private resample(points: number[][], n: number): number[][] {
    const length = this.pathLength(points);
    const interval = length / (n - 1);
    let distance = 0;
    const newPoints = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i]);
      if (distance + d >= interval) {
        const x = points[i - 1][0] + ((interval - distance) / d) * (points[i][0] - points[i - 1][0]);
        const y = points[i - 1][1] + ((interval - distance) / d) * (points[i][1] - points[i - 1][1]);
        newPoints.push([x, y]);
        points.splice(i, 0, [x, y]);
        distance = 0;
      } else {
        distance += d;
      }
    }
    
    if (newPoints.length === n - 1) {
      newPoints.push(points[points.length - 1]);
    }
    
    return newPoints;
  }
  
  private pathLength(points: number[][]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += this.distance(points[i - 1], points[i]);
    }
    return length;
  }
  
  private distance(p1: number[], p2: number[]): number {
    return Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
  }
  
  private rotateToZero(points: number[][]): number[][] {
    const centroid = this.centroid(points);
    const theta = Math.atan2(centroid[1] - points[0][1], centroid[0] - points[0][0]);
    return this.rotateBy(points, -theta);
  }
  
  private centroid(points: number[][]): number[] {
    let x = 0, y = 0;
    for (const point of points) {
      x += point[0];
      y += point[1];
    }
    return [x / points.length, y / points.length];
  }
  
  private rotateBy(points: number[][], theta: number): number[][] {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const centroid = this.centroid(points);
    
    return points.map(point => [
      (point[0] - centroid[0]) * cos - (point[1] - centroid[1]) * sin + centroid[0],
      (point[0] - centroid[0]) * sin + (point[1] - centroid[1]) * cos + centroid[1]
    ]);
  }
  
  private scaleToSquare(points: number[][]): number[][] {
    const bounds = this.boundingBox(points);
    const size = Math.max(bounds.width, bounds.height);
    
    if (size === 0) return points;
    
    return points.map(point => [
      point[0] * (250 / size),
      point[1] * (250 / size)
    ]);
  }
  
  private boundingBox(points: number[][]) {
    let minX = points[0][0], maxX = points[0][0];
    let minY = points[0][1], maxY = points[0][1];
    
    for (const point of points) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  private translateToOrigin(points: number[][]): number[][] {
    const centroid = this.centroid(points);
    return points.map(point => [point[0] - centroid[0], point[1] - centroid[1]]);
  }
  
  private calculateSimilarity(points1: number[][], points2: number[][]): number {
    let distance = 0;
    for (let i = 0; i < points1.length; i++) {
      distance += this.distance(points1[i], points2[i]);
    }
    return Math.max(0, 1 - distance / (0.5 * Math.sqrt(250 * 250 + 250 * 250)));
  }
}

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export default function WandTracker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>();
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const lastDetectedTimeRef = useRef<number>(0);
  const recognizerRef = useRef<UnistrokeRecognizer>(new UnistrokeRecognizer());
  const wandTrackerRef = useRef<WandDetector>(new WandDetector(0.3));
  const spellPointsRef = useRef<number[][]>([]);
  const lastSpellCheckRef = useRef<number>(0);
  const trackingConfidenceRef = useRef<number>(0);

  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState(false);
  const [mlStatus, setMlStatus] = useState(false);
  const [wandStatus, setWandStatus] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [flipHorizontal, setFlipHorizontal] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);
  const [trailLength, setTrailLength] = useState([4]);
  const [sensitivity, setSensitivity] = useState([0.8]);
  const [wandPosition, setWandPosition] = useState({ x: 0, y: 0, visible: false });
  const [currentTab, setCurrentTab] = useState("tracker");
  const [detectedSpell, setDetectedSpell] = useState("");
  const [spellTimeout, setSpellTimeout] = useState<NodeJS.Timeout | null>(null);
  const [learnedSpells, setLearnedSpells] = useState<{ [key: string]: number[][] }>({});
  const [currentSpellName, setCurrentSpellName] = useState("");
  const [isLearningSpell, setIsLearningSpell] = useState(false);
  const [trackingQuality, setTrackingQuality] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [lastHandResults, setLastHandResults] = useState<any>(null);

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('wandTracker-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setIsVideoVisible(settings.isVideoVisible ?? true);
        setFlipHorizontal(settings.flipHorizontal ?? true);
        setFlipVertical(settings.flipVertical ?? false);
        setTrailLength([settings.trailLength ?? 4]);
        setSensitivity([settings.sensitivity ?? 0.8]);
      }
      
      const savedSpells = localStorage.getItem('wandTracker-spells');
      if (savedSpells) {
        const spells = JSON.parse(savedSpells);
        setLearnedSpells(spells);
        // Load spells into recognizer
        Object.entries(spells).forEach(([name, points]) => {
          recognizerRef.current.addTemplate(name, points as number[][]);
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);
  
  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    try {
      const settings = {
        isVideoVisible,
        flipHorizontal,
        flipVertical,
        trailLength: trailLength[0],
        sensitivity: sensitivity[0]
      };
      localStorage.setItem('wandTracker-settings', JSON.stringify(settings));
      localStorage.setItem('wandTracker-spells', JSON.stringify(learnedSpells));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [isVideoVisible, flipHorizontal, flipVertical, trailLength, sensitivity, learnedSpells]);
  
  // Load MediaPipe scripts
  const loadMediaPipeScripts = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.Hands && window.Camera) {
        resolve();
        return;
      }

      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
      ];

      let loadedCount = 0;

      scripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          loadedCount++;
          if (loadedCount === scripts.length) {
            setTimeout(resolve, 500); // Small delay to ensure all scripts are ready
          }
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    });
  }, []);

  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Set drawing style
    ctx.strokeStyle = 'hsl(210, 20%, 85%)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    return ctx;
  }, []);

  // Add trail point
  const addTrailPoint = useCallback((x: number, y: number) => {
    const timestamp = Date.now();
    trailPointsRef.current.push(new TrailPoint(x, y, timestamp));
    
    // Add point for spell recognition
    spellPointsRef.current.push([x, y]);
    
    // Check for spell recognition periodically
    if (timestamp - lastSpellCheckRef.current > 500 && spellPointsRef.current.length > 10) {
      const recognized = recognizerRef.current.recognize(spellPointsRef.current);
      if (recognized && (!isLearningSpell || recognized.name !== currentSpellName)) {
        showSpellDetection(recognized.name);
        spellPointsRef.current = []; // Clear points after recognition
      }
      lastSpellCheckRef.current = timestamp;
    }
    
    // Clear spell points if too old or too many
    if (spellPointsRef.current.length > 100 || timestamp - lastDetectedTimeRef.current > 2000) {
      spellPointsRef.current = [];
    }

    // Remove old trail points
    const currentTime = Date.now();
    const trailLengthMs = trailLength[0] * 1000;
    trailPointsRef.current = trailPointsRef.current.filter(point => 
      point.update(currentTime, trailLengthMs)
    );
  }, [trailLength, isLearningSpell, currentSpellName]);
  
  // Show spell detection
  const showSpellDetection = useCallback((spellName: string) => {
    setDetectedSpell(spellName);
    
    // Clear previous timeout
    if (spellTimeout) {
      clearTimeout(spellTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      setDetectedSpell("");
    }, 8000);
    
    setSpellTimeout(timeout);
  }, [spellTimeout]);
  
  // Learn spell
  const learnSpell = useCallback(() => {
    if (!currentSpellName.trim() || spellPointsRef.current.length < 5) {
      return;
    }
    
    const spellName = currentSpellName.trim();
    const newSpells = { ...learnedSpells, [spellName]: spellPointsRef.current.slice() };
    
    setLearnedSpells(newSpells);
    recognizerRef.current.addTemplate(spellName, spellPointsRef.current);
    
    // Clear learning state
    setCurrentSpellName("");
    setIsLearningSpell(false);
    spellPointsRef.current = [];
    
    showSpellDetection(`Learned: ${spellName}`);
  }, [currentSpellName, learnedSpells, showSpellDetection]);

  // Draw trail
  const drawTrail = useCallback((ctx: CanvasRenderingContext2D) => {
    if (trailPointsRef.current.length < 2) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const currentTime = Date.now();
    const trailLengthMs = trailLength[0] * 1000;

    // Update and filter trail points
    trailPointsRef.current = trailPointsRef.current.filter(point => 
      point.update(currentTime, trailLengthMs)
    );

    if (trailPointsRef.current.length < 2) return;

    // Draw trail with gradient opacity
    for (let i = 1; i < trailPointsRef.current.length; i++) {
      const point1 = trailPointsRef.current[i - 1];
      const point2 = trailPointsRef.current[i];

      const opacity1 = point1.getOpacity(trailLengthMs);
      const opacity2 = point2.getOpacity(trailLengthMs);

      if (opacity1 > 0 && opacity2 > 0) {
        const avgOpacity = (opacity1 + opacity2) / 2;

        ctx.globalAlpha = avgOpacity;
        ctx.strokeStyle = `hsla(210, 20%, 85%, ${avgOpacity})`;
        ctx.lineWidth = 3 * avgOpacity;

        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }, [trailLength]);

  // Handle hand detection results
  const onResults = useCallback((results: any) => {
    setMlStatus(true);
    setLastHandResults(results); // Store for debug visualization

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const handedness = results.multiHandedness?.[0]?.label || 'Right';
      
      // Use enhanced wand tracking with lower threshold
      const { point: wandTip, confidence } = wandTrackerRef.current.getWandTip(landmarks, handedness);
      
      trackingConfidenceRef.current = confidence;
      setTrackingQuality(confidence);

      if (wandTip && canvasRef.current && confidence > 0.2) {
        const x = wandTip[0] * canvasRef.current.width;
        const y = wandTip[1] * canvasRef.current.height;

        addTrailPoint(x, y);
        lastDetectedTimeRef.current = Date.now();

        setWandPosition({ x, y, visible: true });
        setWandStatus(true);
        
        // If learning a spell and we have enough points, auto-learn
        if (isLearningSpell && spellPointsRef.current.length > 20 && currentSpellName.trim()) {
          learnSpell();
        }
      } else {
        setWandStatus(false);
      }
    } else {
      setWandStatus(false);
      wandTrackerRef.current.reset();
      trackingConfidenceRef.current = 0;
      setTrackingQuality(0);

      // Hide wand indicator if no hand detected for 300ms (more responsive)
      if (Date.now() - lastDetectedTimeRef.current > 300) {
        setWandPosition(prev => ({ ...prev, visible: false }));
        // Clear spell points if no detection for a while
        if (Date.now() - lastDetectedTimeRef.current > 800) {
          spellPointsRef.current = [];
        }
      }
    }
  }, [addTrailPoint, isLearningSpell, currentSpellName, learnSpell]);

  // Initialize MediaPipe Hands
  const initMediaPipe = useCallback(async () => {
    try {
      if (!window.Hands) {
        throw new Error('MediaPipe Hands not loaded');
      }

      const hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: Math.max(0.3, sensitivity[0] * 0.7),
        minTrackingConfidence: Math.max(0.3, sensitivity[0] * 0.7)
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      setMlStatus(true);
      return true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      setMlStatus(false);
      return false;
    }
  }, [sensitivity, onResults]);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      const video = videoRef.current;
      if (!video) throw new Error('Video element not found');

      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      setCameraStatus(true);

      // Initialize camera utils
      if (window.Camera && handsRef.current) {
        const camera = new window.Camera(video, {
          onFrame: async () => {
            if (handsRef.current) {
              await handsRef.current.send({ image: video });
            }
          },
          width: 1280,
          height: 720
        });

        cameraRef.current = camera;
        camera.start();
      }

      return true;
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraStatus(false);
      return false;
    }
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const ctx = initCanvas();
    if (ctx) {
      drawTrail(ctx);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [initCanvas, drawTrail]);

  // Enable camera
  const enableCamera = useCallback(async () => {
    setIsLoading(true);
    setIsPermissionGranted(true);

    try {
      await loadMediaPipeScripts();
      const mlSuccess = await initMediaPipe();
      
      if (mlSuccess) {
        const cameraSuccess = await initCamera();
        if (cameraSuccess) {
          animate();
        }
      }
    } catch (error) {
      console.error('Initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadMediaPipeScripts, initMediaPipe, initCamera, animate]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    trailPointsRef.current = [];
    spellPointsRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  // Save settings when they change
  useEffect(() => {
    saveSettings();
  }, [saveSettings]);
  
  // Update sensitivity
  useEffect(() => {
    if (handsRef.current) {
      handsRef.current.setOptions({
        minDetectionConfidence: sensitivity[0],
        minTrackingConfidence: sensitivity[0]
      });
    }
  }, [sensitivity]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (spellTimeout) {
        clearTimeout(spellTimeout);
      }
    };
  }, [spellTimeout]);

  const StatusIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center space-x-2 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
      <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'} ${!status ? 'status-indicator' : ''}`} />
      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Main Canvas for Drawing */}
      <canvas
        ref={canvasRef}
        id="drawingCanvas"
        className="absolute inset-0 w-full h-full cursor-crosshair"
        data-testid="drawing-canvas"
      />

      {/* Webcam Video Element */}
      <video
        ref={videoRef}
        id="webcamVideo"
        className={`absolute top-4 right-4 w-48 h-36 bg-card border border-border rounded-lg shadow-lg z-10 transition-transform ${isVideoVisible ? 'block' : 'hidden'}`}
        style={{
          transform: `scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`
        }}
        autoPlay
        muted
        playsInline
        data-testid="webcam-video"
      />

      {/* Status Indicators */}
      <div className="status-indicators absolute top-4 left-4 z-20 flex flex-col space-y-2 sm:space-y-2">
        <StatusIndicator status={cameraStatus} label="Camera" />
        <StatusIndicator status={mlStatus} label="ML Tracking" />
        <StatusIndicator status={wandStatus} label={`Wand ${Math.round(trackingQuality * 100)}%`} />
        {debugMode && (
          <div className="bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Sensitivity: {sensitivity[0]}</div>
              <div>Trail Length: {trailLength[0]}s</div>
              <div>Points: {spellPointsRef.current?.length || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Control Panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-4xl px-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="tracker" className="flex items-center space-x-2">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tracker</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker">
            <div className="control-panel px-4 sm:px-6 py-4 rounded-xl shadow-xl">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Button
                  onClick={clearCanvas}
                  className="flex items-center space-x-2 w-full sm:w-auto"
                  data-testid="button-clear-canvas"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Trail</span>
                </Button>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Trail:</label>
                  <Slider
                    value={trailLength}
                    onValueChange={setTrailLength}
                    min={1}
                    max={8}
                    step={1}
                    className="w-20"
                    data-testid="slider-trail-length"
                  />
                  <span className="text-sm text-foreground w-6">{trailLength[0]}s</span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Sensitivity:</label>
                  <Slider
                    value={sensitivity}
                    onValueChange={setSensitivity}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-20"
                    data-testid="slider-sensitivity"
                  />
                  <span className="text-sm text-foreground w-8">{sensitivity[0]}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="control-panel px-4 sm:px-6 py-4 rounded-xl shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Camera Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Camera className="w-5 h-5" />
                      <span>Camera Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-video" className="text-sm">Show Video Feed</Label>
                      <Switch
                        id="show-video"
                        checked={isVideoVisible}
                        onCheckedChange={setIsVideoVisible}
                        data-testid="switch-video-visibility"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="flip-horizontal" className="text-sm flex items-center space-x-2">
                        <FlipHorizontal className="w-4 h-4" />
                        <span>Flip Horizontal</span>
                      </Label>
                      <Switch
                        id="flip-horizontal"
                        checked={flipHorizontal}
                        onCheckedChange={setFlipHorizontal}
                        data-testid="switch-flip-horizontal"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="flip-vertical" className="text-sm flex items-center space-x-2">
                        <FlipVertical className="w-4 h-4" />
                        <span>Flip Vertical</span>
                      </Label>
                      <Switch
                        id="flip-vertical"
                        checked={flipVertical}
                        onCheckedChange={setFlipVertical}
                        data-testid="switch-flip-vertical"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Spell Learning */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Wand2 className="w-5 h-5" />
                      <span>Spell Learning</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <Input
                        placeholder="Spell name (e.g., Lumos)"
                        value={currentSpellName}
                        onChange={(e) => setCurrentSpellName(e.target.value)}
                        className="flex-1"
                        data-testid="input-spell-name"
                      />
                      <Button
                        onClick={() => {
                          if (isLearningSpell) {
                            if (currentSpellName.trim() && spellPointsRef.current.length > 5) {
                              learnSpell();
                            } else {
                              setIsLearningSpell(false);
                              spellPointsRef.current = [];
                            }
                          } else {
                            if (currentSpellName.trim()) {
                              setIsLearningSpell(true);
                              spellPointsRef.current = [];
                            }
                          }
                        }}
                        variant={isLearningSpell ? "destructive" : "default"}
                        disabled={!currentSpellName.trim()}
                        className="w-full sm:w-auto"
                        data-testid="button-learn-spell"
                      >
                        {isLearningSpell ? 'Save Spell' : 'Learn'}
                      </Button>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="debug-mode" className="text-sm">Debug Mode</Label>
                        <Switch
                          id="debug-mode"
                          checked={debugMode}
                          onCheckedChange={setDebugMode}
                          data-testid="switch-debug-mode"
                        />
                      </div>
                      {debugMode && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          <div>Tracking: {trackingQuality > 0 ? `${Math.round(trackingQuality * 100)}%` : 'No detection'}</div>
                          <div>Trail Points: {spellPointsRef.current?.length || 0}</div>
                          <div>Hand Detected: {lastHandResults?.multiHandLandmarks?.length > 0 ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isLearningSpell ? 'Draw the spell pattern with your wand...' : `${Object.keys(learnedSpells).length} spells learned`}
                    </div>
                    {Object.keys(learnedSpells).length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Learned Spells:</Label>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(learnedSpells).map(spell => (
                            <div key={spell} className="flex items-center space-x-1 px-2 py-1 bg-accent rounded text-xs">
                              <span>{spell}</span>
                              <button
                                onClick={() => {
                                  const newSpells = { ...learnedSpells };
                                  delete newSpells[spell];
                                  setLearnedSpells(newSpells);
                                  recognizerRef.current.templates = newSpells;
                                }}
                                className="text-destructive hover:text-destructive/80 ml-1"
                                data-testid={`button-delete-spell-${spell}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Camera Permission Modal */}
      {!isPermissionGranted && (
        <div className="fixed inset-0 permission-modal flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Camera Access Required</h2>
                <p className="text-muted-foreground mb-6">
                  This app needs access to your camera to track wand movements and create magical drawings.
                </p>
                <Button
                  onClick={enableCamera}
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-enable-camera"
                >
                  {isLoading ? 'Loading...' : 'Enable Camera'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 permission-modal flex items-center justify-center z-40">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="loading-spinner w-8 h-8 border-4 border-muted border-t-primary rounded-full mx-auto mb-4" />
                <p className="text-foreground font-medium">Loading ML Models...</p>
                <p className="text-muted-foreground text-sm mt-2">This may take a moment</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Spell Detection Display */}
      {detectedSpell && (
        <div className="spell-notification absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-accent/90 backdrop-blur-sm text-accent-foreground px-6 py-3 rounded-lg border border-accent/50 shadow-lg">
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold flex items-center justify-center space-x-2">
                <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="truncate max-w-48">{detectedSpell}</span>
              </div>
              <div className="text-xs text-accent-foreground/80 mt-1">Spell Cast!</div>
            </div>
          </div>
        </div>
      )}

      {/* Wand Detection Indicator */}
      {wandPosition.visible && (
        <div
          className="absolute w-4 h-4 bg-accent rounded-full wand-indicator z-30 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${wandPosition.x}px`,
            top: `${wandPosition.y}px`
          }}
          data-testid="wand-indicator"
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Trash2, Eye, EyeOff, Settings, Wand2, RotateCcw, FlipHorizontal, FlipVertical, Play, Pause } from "lucide-react";

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
  
  normalizePoints(points: number[][]): number[][] {
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
  
  calculateSimilarity(points1: number[][], points2: number[][]): number {
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
  // Build timestamp: ${new Date().toISOString()}
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>();
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const lastDetectedTimeRef = useRef<number>(0);
  const recognizerRef = useRef<UnistrokeRecognizer>(new UnistrokeRecognizer());
  const spellPointsRef = useRef<number[][]>([]);
  const lastSpellCheckRef = useRef<number>(0);
  const learningPatternsRef = useRef<number[][][]>([]);
  const rawPointsRef = useRef<{x: number, y: number}[]>([]);

  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState(false);
  const [mlStatus, setMlStatus] = useState(false);
  const [wandStatus, setWandStatus] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [flipHorizontal, setFlipHorizontal] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);
  const [trailLength, setTrailLength] = useState([4]);
  const [sensitivity, setSensitivity] = useState([0.8]);
  const [smoothing, setSmoothing] = useState([3]);
  const [isPaused, setIsPaused] = useState(false);
  const [wandPosition, setWandPosition] = useState({ x: 0, y: 0, visible: false });
  const [currentTab, setCurrentTab] = useState("tracker");
  const [detectedSpell, setDetectedSpell] = useState("");
  const [spellTimeout, setSpellTimeout] = useState<NodeJS.Timeout | null>(null);
  const [learnedSpells, setLearnedSpells] = useState<{ [key: string]: number[][] }>({});
  const [currentSpellName, setCurrentSpellName] = useState("");
  const [isLearningSpell, setIsLearningSpell] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [learningStep, setLearningStep] = useState(0);
  const [learningProgress, setLearningProgress] = useState("");
  const [isLoadingSpells, setIsLoadingSpells] = useState(false);
  const [spellsEnabled, setSpellsEnabled] = useState(true);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [spellWindow, setSpellWindow] = useState([20]); // Number of points to analyze for spells
  const BUILD_VERSION = "v2024090207";
  const spellTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        setSmoothing([settings.smoothing ?? 3]);
        setIsPaused(settings.isPaused ?? false);
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
        sensitivity: sensitivity[0],
        smoothing: smoothing[0],
        isPaused
      };
      localStorage.setItem('wandTracker-settings', JSON.stringify(settings));
      localStorage.setItem('wandTracker-spells', JSON.stringify(learnedSpells));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [isVideoVisible, flipHorizontal, flipVertical, trailLength, sensitivity, smoothing, isPaused, learnedSpells]);
  
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

  // Show spell detection
  const showSpellDetection = useCallback((spellName: string) => {
    console.log('Showing spell detection:', spellName);
    setDetectedSpell(spellName);
    
    // Clear previous timeout
    setSpellTimeout(prev => {
      if (prev) {
        clearTimeout(prev);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        setDetectedSpell("");
        setSpellTimeout(null);
      }, 8000);
      
      return timeout;
    });
  }, []);

  // Add trail point with smoothing
  const addTrailPoint = useCallback((x: number, y: number) => {
    const timestamp = Date.now();
    
    // Add raw point to smoothing buffer
    rawPointsRef.current.push({ x, y });
    
    // Keep only the last N points for smoothing
    const smoothingPoints = smoothing[0];
    if (rawPointsRef.current.length > smoothingPoints) {
      rawPointsRef.current = rawPointsRef.current.slice(-smoothingPoints);
    }
    
    // Calculate smoothed position using moving average
    let smoothedX = x;
    let smoothedY = y;
    
    if (smoothingPoints > 1 && rawPointsRef.current.length >= 2) {
      const sumX = rawPointsRef.current.reduce((sum, point) => sum + point.x, 0);
      const sumY = rawPointsRef.current.reduce((sum, point) => sum + point.y, 0);
      smoothedX = sumX / rawPointsRef.current.length;
      smoothedY = sumY / rawPointsRef.current.length;
    }
    
    // Add smoothed point to trail
    trailPointsRef.current.push(new TrailPoint(smoothedX, smoothedY, timestamp));
    
    // Add original point for spell recognition (unsmoothed for accuracy)
    spellPointsRef.current.push([x, y]);
    
    // Check for spell recognition periodically (without interrupting tracking)
    if (spellsEnabled && timestamp - lastSpellCheckRef.current > 1000 && spellPointsRef.current.length > spellWindow[0]) {
      try {
        // Use a copy for recognition so we don't interrupt tracking
        const recentPoints = spellPointsRef.current.slice(-spellWindow[0]);
        const recognized = recognizeSpellPattern(recentPoints);
        if (recognized && (!isLearningSpell || recognized !== currentSpellName)) {
          console.log(`🔮 Casting spell: ${recognized}`);
          setDetectedSpell(recognized);
          
          // Clear any existing timeout first
          if (spellTimeoutRef.current) {
            clearTimeout(spellTimeoutRef.current);
          }
          
          // Set new timeout
          spellTimeoutRef.current = setTimeout(() => {
            setDetectedSpell("");
            spellTimeoutRef.current = null;
          }, 2000);
          
          // Pause recognition for 2 seconds after detection
          lastSpellCheckRef.current = timestamp + 2000;
        }
        lastSpellCheckRef.current = timestamp;
      } catch (error) {
        console.error('Spell recognition error:', error);
        lastSpellCheckRef.current = timestamp + 1000;
      }
    }
    
    // Keep spell points manageable but don't clear during active tracking
    if (spellPointsRef.current.length > spellWindow[0] * 3) {
      spellPointsRef.current = spellPointsRef.current.slice(-spellWindow[0] * 2);
    }

    // Remove old trail points
    const currentTime = Date.now();
    const trailLengthMs = trailLength[0] * 1000;
    trailPointsRef.current = trailPointsRef.current.filter(point => 
      point.update(currentTime, trailLengthMs)
    );
  }, [smoothing, trailLength, isLearningSpell, currentSpellName]);
  
  // Finish learning a single pattern
  const finishLearningPattern = useCallback(() => {
    if (spellPointsRef.current.length < 5) return;
    
    learningPatternsRef.current.push([...spellPointsRef.current]);
    spellPointsRef.current = [];
    
    const nextStep = learningStep + 1;
    setLearningStep(nextStep);
    
    if (nextStep < 3) {
      setLearningProgress(`Pattern ${nextStep}/3 learned. Draw it ${3 - nextStep} more time${3 - nextStep === 1 ? '' : 's'}.`);
    } else {
      // Learn spell with averaged pattern
      completeSpellLearning();
    }
  }, [learningStep, learnedSpells, showSpellDetection]);
  
  // Check if patterns are similar enough
  const checkPatternSimilarity = useCallback((patterns: number[][][]): boolean => {
    if (patterns.length !== 3) return false;
    
    // Calculate similarity between each pair of patterns
    const similarities: number[] = [];
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const sim = recognizerRef.current.calculateSimilarity(
          recognizerRef.current.normalizePoints(patterns[i]),
          recognizerRef.current.normalizePoints(patterns[j])
        );
        similarities.push(sim);
      }
    }
    
    // All pairs should be at least 70% similar
    const averageSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    return averageSimilarity > 0.7;
  }, []);

  // Complete spell learning after 3 patterns
  const completeSpellLearning = useCallback(() => {
    if (!currentSpellName.trim() || learningPatternsRef.current.length < 3) {
      return;
    }
    
    const spellName = currentSpellName.trim();
    
    // Check if the 3 patterns are similar enough
    if (!checkPatternSimilarity(learningPatternsRef.current)) {
      setLearningProgress("❌ Patterns too different. Try again with more consistent movements.");
      setLearningStep(0);
      learningPatternsRef.current = [];
      spellPointsRef.current = [];
      return;
    }
    
    // Use the first pattern as the template
    const template = learningPatternsRef.current[0];
    
    const newSpells = { ...learnedSpells, [spellName]: template };
    setLearnedSpells(newSpells);
    recognizerRef.current.addTemplate(spellName, template);
    
    // Clear learning state
    setCurrentSpellName("");
    setIsLearningSpell(false);
    setLearningStep(0);
    setLearningProgress("");
    learningPatternsRef.current = [];
    spellPointsRef.current = [];
    
    setDetectedSpell(`✨ Learned: ${spellName}`);
    
    // Clear the spell display after 3 seconds
    setTimeout(() => {
      setDetectedSpell("");
    }, 3000);
  }, [currentSpellName, learnedSpells, checkPatternSimilarity]);

  // Load Harry Potter spells
  const loadHarryPotterSpells = useCallback(() => {
    try {
      const harryPotterSpells = {
        "Lumos": [[0, 0], [0, -50]], // Simple up stroke
        "Nox": [[0, 0], [0, 50]], // Simple down stroke
        "Accio": [[-50, 0], [50, 0]], // Pull toward gesture
        "Expelliarmus": [[0, 0], [30, -20], [50, 10]], // Flick away
        "Wingardium Leviosa": [[0, 0], [-20, -10], [20, -10], [0, 0]], // Swish and flick
        "Stupefy": [[0, 0], [0, -40]], // Straight thrust
        "Petrificus Totalus": [[0, 0], [30, 0], [0, 30], [-30, 0], [0, -30]], // Binding cross
        "Alohomora": [[0, 0], [20, 0], [20, 20], [0, 20]], // Key turn motion
        "Incendio": [[0, 0], [15, -15], [30, 0], [15, 15]], // Flame flick
        "Aguamenti": [[0, 0], [-20, -10], [-10, 10], [20, -10], [10, 10]], // Water wave
        "Expecto Patronum": [[0, 0], [30, 0], [21, 21], [0, 30], [-21, 21], [-30, 0], [-21, -21], [0, -30], [21, -21]], // Protective circle
        "Riddikulus": [[0, 0], [20, -20], [-20, -20], [20, 20], [-20, 20]], // Laugh gesture
        "Flipendo": [[0, 0], [40, 0]], // Push force
        "Impedimenta": [[0, 0], [0, -30], [30, -30], [30, 0]], // Blocking wall
        "Rictusempra": [[0, 0], [10, -10], [-10, -10], [10, 10], [-10, 10], [0, 0]] // Tickle wiggle
      };

      console.log('Loading Harry Potter spells...');
      console.log('Merging spells...');
      const newSpells = { ...learnedSpells, ...harryPotterSpells };
      setLearnedSpells(newSpells);
      
      console.log('Adding to recognizer...');
      Object.entries(harryPotterSpells).forEach(([name, pattern]) => {
        recognizerRef.current.addTemplate(name, pattern);
      });
      
      console.log('Showing success message...');
      setDetectedSpell(`✨ Loaded ${Object.keys(harryPotterSpells).length} Harry Potter spells!`);
      
      // Clear message after delay
      setTimeout(() => {
        setDetectedSpell("");
      }, 3000);
      
      console.log('Harry Potter spells loaded successfully');
    } catch (error) {
      console.error('Error loading Harry Potter spells:', error);
    }
  }, [learnedSpells]);

  // Simple pattern matching using vector comparison
  const recognizeSpellPattern = useCallback((drawnPattern: number[][]) => {
    try {
      if (Object.keys(learnedSpells).length === 0 || drawnPattern.length < 5) return null;
      
      // Normalize the drawn pattern
      const normalizedDrawn = normalizePattern(drawnPattern);
      if (normalizedDrawn.length === 0) return null;
      
      let bestMatch = null;
      let bestScore = Infinity;
      const threshold = 200; // Lower = more strict matching
      
      Object.entries(learnedSpells).forEach(([spellName, pattern]) => {
        if (!pattern || pattern.length === 0) return;
        
        const normalizedSpell = normalizePattern(pattern);
        if (normalizedSpell.length === 0) return;
        
        const distance = calculatePatternDistance(normalizedDrawn, normalizedSpell);
        
        if (distance < bestScore && distance < threshold) {
          bestScore = distance;
          bestMatch = spellName;
        }
      });
      
      if (bestMatch) {
        console.log(`🔮 Spell recognized: ${bestMatch} (distance: ${bestScore.toFixed(1)})`);
      }
      
      return bestMatch;
    } catch (error) {
      console.error('Pattern recognition error:', error);
      return null;
    }
  }, [learnedSpells]);

  // Normalize pattern to standard size and position
  const normalizePattern = useCallback((pattern: number[][]) => {
    if (pattern.length === 0) return [];
    
    // Find bounds
    const xs = pattern.map(p => p[0]);
    const ys = pattern.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const scale = Math.max(width, height) || 1;
    
    // Normalize to 0-100 range
    return pattern.map(([x, y]) => [
      ((x - minX) / scale) * 100,
      ((y - minY) / scale) * 100
    ]);
  }, []);

  // Calculate distance between two normalized patterns
  const calculatePatternDistance = useCallback((pattern1: number[][], pattern2: number[][]) => {
    const maxLength = Math.max(pattern1.length, pattern2.length);
    let totalDistance = 0;
    
    for (let i = 0; i < maxLength; i++) {
      const p1 = pattern1[Math.min(i, pattern1.length - 1)] || [0, 0];
      const p2 = pattern2[Math.min(i, pattern2.length - 1)] || [0, 0];
      
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    return totalDistance / maxLength;
  }, []);

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

    // Skip tracking if paused
    if (isPaused) {
      setWandStatus(false);
      setWandPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const wandTip = landmarks[8]; // Index finger tip

      if (wandTip && canvasRef.current) {
        // Adjust coordinates based on flip settings
        const normalizedX = flipHorizontal ? (1 - wandTip.x) : wandTip.x;
        const normalizedY = flipVertical ? (1 - wandTip.y) : wandTip.y;
        
        const x = normalizedX * canvasRef.current.width;
        const y = normalizedY * canvasRef.current.height;

        addTrailPoint(x, y);
        lastDetectedTimeRef.current = Date.now();

        setWandPosition({ x, y, visible: true });
        setWandStatus(true);
        
        // Store spell points for learning (removed automatic pattern capture)
      } else {
        setWandStatus(false);
      }
    } else {
      setWandStatus(false);

      // Hide wand indicator if no hand detected for 500ms
      if (Date.now() - lastDetectedTimeRef.current > 500) {
        setWandPosition(prev => ({ ...prev, visible: false }));
        // Clear spell points if no detection for a while
        if (Date.now() - lastDetectedTimeRef.current > 1000) {
          if (!isLearningSpell) {
            spellPointsRef.current = [];
          }
        }
      }
    }
  }, [addTrailPoint, isLearningSpell, isPaused]);

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
      if (spellTimeoutRef.current) {
        clearTimeout(spellTimeoutRef.current);
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
      <div className="status-indicators absolute top-4 left-4 right-4 z-10 flex flex-row justify-between items-center">
        <div className="flex items-center space-x-2 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
          <Switch
            checked={spellsEnabled}
            onCheckedChange={(checked) => {
              setSpellsEnabled(checked);
              
              // When disabling spells, clear everything spell-related
              if (!checked) {
                setDetectedSpell(""); // Clear any displayed spell
                spellPointsRef.current = []; // Clear spell recognition data
                lastSpellCheckRef.current = 0; // Reset spell check timer
                
                // Clear any pending spell timeout
                if (spellTimeoutRef.current) {
                  clearTimeout(spellTimeoutRef.current);
                  spellTimeoutRef.current = null;
                }
              }
            }}
            className="scale-75"
            data-testid="switch-spells"
          />
          <span className="text-xs text-muted-foreground">Spells</span>
        </div>
        
        <div className="flex space-x-3">
          <StatusIndicator status={cameraStatus} label="Camera" />
          <StatusIndicator status={mlStatus && !isPaused} label={isPaused ? "Paused" : "Tracking"} />
          <StatusIndicator status={wandStatus && !isPaused} label="Wand" />
        </div>
        {debugMode && (
          <div className="bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Sensitivity: {sensitivity[0]}</div>
              <div>Trail Length: {trailLength[0]}s</div>
              <div>Smoothing: {smoothing[0]} points</div>
              <div>Scanning: {isPaused ? 'Paused' : 'Active'}</div>
              <div>Wand Status: {wandStatus ? 'Detected' : 'Not detected'}</div>
              <div>Trail Points: {spellPointsRef.current?.length || 0}</div>
              <div>Learning: {isLearningSpell ? `Step ${learningStep + 1}/3` : 'Off'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Control Toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
          size="sm"
          variant="outline"
          className="rounded-full w-12 h-12 p-0 bg-card/90 backdrop-blur-sm"
          data-testid="button-mobile-toggle"
        >
          {mobileControlsOpen ? "✕" : "⚙️"}
        </Button>
      </div>

      {/* Main Control Panel */}
      <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-4xl px-4 transition-transform duration-300 ${
        mobileControlsOpen ? 'translate-y-0' : 'md:translate-y-0 translate-y-full'
      }`}>
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="tracker" className="flex items-center space-x-2" data-testid="tab-tracker">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tracker</span>
            </TabsTrigger>
            <TabsTrigger value="spells" className="flex items-center space-x-2" data-testid="tab-spells">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Spells</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2" data-testid="tab-settings">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker">
            <div className="control-panel px-4 sm:px-6 py-4 rounded-xl shadow-xl">
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Button
                  onClick={clearCanvas}
                  className="flex items-center space-x-2 w-full sm:w-auto"
                  data-testid="button-clear-canvas"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Trail</span>
                </Button>

                <Button
                  onClick={() => setIsPaused(!isPaused)}
                  variant={isPaused ? "default" : "secondary"}
                  className="flex items-center space-x-2 w-full sm:w-auto"
                  data-testid="button-pause-scanning"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  )}
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

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Smooth:</label>
                  <Slider
                    value={smoothing}
                    onValueChange={setSmoothing}
                    min={1}
                    max={10}
                    step={1}
                    className="w-16"
                    data-testid="slider-smoothing"
                  />
                  <span className="text-sm text-foreground w-4">{smoothing[0]}</span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Spell Window:</label>
                  <Slider
                    value={spellWindow}
                    onValueChange={setSpellWindow}
                    min={10}
                    max={50}
                    step={5}
                    className="w-20"
                    data-testid="slider-spell-window"
                  />
                  <span className="text-sm text-foreground w-6">{spellWindow[0]}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spells">
            <div className="control-panel px-4 sm:px-6 py-3 rounded-xl shadow-xl max-h-[50vh] overflow-y-auto">
              <div className="space-y-3">
                {/* Spell Learning */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Wand2 className="w-5 h-5" />
                      <span>Learn New Spell</span>
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
                            // Cancel learning
                            setIsLearningSpell(false);
                            setLearningStep(0);
                            setLearningProgress("");
                            learningPatternsRef.current = [];
                            spellPointsRef.current = [];
                          } else {
                            if (currentSpellName.trim()) {
                              setIsLearningSpell(true);
                              setLearningStep(0);
                              setLearningProgress("Draw the first pattern...");
                              learningPatternsRef.current = [];
                              spellPointsRef.current = [];
                            }
                          }
                        }}
                        variant={isLearningSpell ? "destructive" : "default"}
                        disabled={!currentSpellName.trim()}
                        className="w-full sm:w-auto"
                        data-testid="button-learn-spell"
                      >
                        {isLearningSpell ? 'Cancel' : 'Learn Spell'}
                      </Button>
                    </div>
                    
                    {/* Capture Pattern Button */}
                    {isLearningSpell && (
                      <Button
                        onClick={() => {
                          if (spellPointsRef.current.length < 5) {
                            setLearningProgress("❌ Pattern too short. Draw a longer movement and try again.");
                            return;
                          }
                          finishLearningPattern();
                        }}
                        disabled={spellPointsRef.current.length < 5}
                        className="w-full"
                        data-testid="button-capture-pattern"
                      >
                        Capture Pattern {learningStep + 1}/3
                      </Button>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      {isLearningSpell ? (
                        <div className="space-y-1">
                          <div className="font-medium text-accent">🔮 Learning Mode Active</div>
                          <div>{learningProgress || `Draw pattern ${learningStep + 1}/3, then click 'Capture Pattern'`}</div>
                        </div>
                      ) : (
                        <div>{Object.keys(learnedSpells).length} spells learned</div>
                      )}
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

                {/* Harry Potter Spells */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Wand2 className="w-5 h-5" />
                      <span>Harry Potter Spells</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                      Load 15 classic Harry Potter spells with their traditional wand movements.
                    </div>
                    <Button
                      onClick={loadHarryPotterSpells}
                      className="w-full"
                      data-testid="button-load-hp-spells"
                    >
                      Activate Harry Potter Spells
                    </Button>
                  </CardContent>
                </Card>

                {/* Debug Mode */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Debug Information</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                        <div>Wand Status: {wandStatus ? 'Detected' : 'Not detected'}</div>
                        <div>Trail Points: {spellPointsRef.current?.length || 0}</div>
                        <div>Learning: {isLearningSpell ? `Pattern ${learningStep + 1}/3` : 'Off'}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="control-panel px-4 sm:px-6 py-3 rounded-xl shadow-xl max-h-[50vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
        <div className="spell-notification absolute bottom-[25vh] left-1/2 transform -translate-x-1/2 z-25">
          <div className="bg-purple-900/95 backdrop-blur-sm text-purple-100 px-8 py-4 rounded-xl border-2 border-purple-400/50 shadow-2xl">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold flex items-center justify-center space-x-2">
                <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
                <span className="truncate max-w-64">{detectedSpell}</span>
              </div>
              <div className="text-sm text-purple-200/90 mt-1">✨ Spell Recognized!</div>
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

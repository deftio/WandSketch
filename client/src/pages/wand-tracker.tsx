import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Trash2, Eye, EyeOff } from "lucide-react";

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

  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState(false);
  const [mlStatus, setMlStatus] = useState(false);
  const [wandStatus, setWandStatus] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [trailLength, setTrailLength] = useState([4]);
  const [sensitivity, setSensitivity] = useState([0.8]);
  const [wandPosition, setWandPosition] = useState({ x: 0, y: 0, visible: false });

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

    // Remove old points
    const currentTime = Date.now();
    const trailLengthMs = trailLength[0] * 1000;
    trailPointsRef.current = trailPointsRef.current.filter(point => 
      point.update(currentTime, trailLengthMs)
    );
  }, [trailLength]);

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

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const wandTip = landmarks[8]; // Index finger tip

      if (wandTip && canvasRef.current) {
        const x = wandTip.x * canvasRef.current.width;
        const y = wandTip.y * canvasRef.current.height;

        addTrailPoint(x, y);
        lastDetectedTimeRef.current = Date.now();

        setWandPosition({ x, y, visible: true });
        setWandStatus(true);
      } else {
        setWandStatus(false);
      }
    } else {
      setWandStatus(false);

      // Hide wand indicator if no hand detected for 500ms
      if (Date.now() - lastDetectedTimeRef.current > 500) {
        setWandPosition(prev => ({ ...prev, visible: false }));
      }
    }
  }, [addTrailPoint]);

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
        modelComplexity: 1,
        minDetectionConfidence: sensitivity[0],
        minTrackingConfidence: sensitivity[0]
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
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

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
    };
  }, []);

  const StatusIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center space-x-2 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
      <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'} ${!status ? 'status-indicator' : ''}`} />
      <span className="text-sm text-muted-foreground">{label}</span>
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
        className={`absolute top-4 right-4 w-48 h-36 bg-card border border-border rounded-lg shadow-lg z-10 ${isVideoVisible ? 'block' : 'hidden'}`}
        autoPlay
        muted
        playsInline
        data-testid="webcam-video"
      />

      {/* Status Indicators */}
      <div className="absolute top-4 left-4 z-20 space-y-2">
        <StatusIndicator status={cameraStatus} label="Camera" />
        <StatusIndicator status={mlStatus} label="ML Tracking" />
        <StatusIndicator status={wandStatus} label="Wand Detected" />
      </div>

      {/* Control Panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="control-panel px-6 py-4 rounded-xl shadow-xl">
          <div className="flex items-center space-x-6">
            <Button
              onClick={clearCanvas}
              className="flex items-center space-x-2"
              data-testid="button-clear-canvas"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </Button>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-muted-foreground">Trail Length:</label>
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

            <div className="flex items-center space-x-2">
              <label className="text-sm text-muted-foreground">Sensitivity:</label>
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

            <Button
              onClick={() => setIsVideoVisible(!isVideoVisible)}
              variant="secondary"
              data-testid="button-toggle-video"
            >
              {isVideoVisible ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {isVideoVisible ? 'Hide Video' : 'Show Video'}
            </Button>
          </div>
        </div>
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

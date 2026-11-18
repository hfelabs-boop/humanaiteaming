import React, { useEffect, useRef, useState } from 'react';
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { Loader2, Scan, AlertTriangle, VideoOff, ShieldAlert, Lock } from 'lucide-react';
import { GameConfig } from '../types';

export type TrackerStatus = 'INITIALIZING' | 'NO_PERMISSION' | 'DISABLED' | 'SEARCHING' | 'TRACKING' | 'OUT_OF_BOUNDS' | 'DISTRACTED';

interface WebcamTrackerProps {
  onFaceDetected: (detected: boolean) => void;
  onStatusChange?: (status: TrackerStatus) => void;
  onTrackingError?: (error: 'bounds' | 'distraction') => void;
  active: boolean;
  config: GameConfig;
  /** Increment to bypass sensors from outside the panel (e.g. the training coach). */
  bypassSignal?: number;
}

const WebcamTracker: React.FC<WebcamTrackerProps> = ({ onFaceDetected, onStatusChange, onTrackingError, active, config, bypassSignal = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Detectors
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Refs for loop variables to avoid re-renders
  const lastDetectionTimeRef = useRef(0);
  const requestRef = useRef<number>(0);
  const onFaceDetectedRef = useRef(onFaceDetected);
  const onTrackingErrorRef = useRef(onTrackingError);
  const onStatusChangeRef = useRef(onStatusChange);
  
  // Keep callback ref fresh
  useEffect(() => {
    onFaceDetectedRef.current = onFaceDetected;
  }, [onFaceDetected]);
  
  useEffect(() => {
    onTrackingErrorRef.current = onTrackingError;
  }, [onTrackingError]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // Internal tracking status for UI
  const [trackingStatus, setTrackingStatus] = useState<TrackerStatus>('INITIALIZING');
  
  // We use a ref for status inside loop to decide logic, and state for UI rendering
  const trackingStatusRef = useRef<TrackerStatus>('INITIALIZING');
  
  // Store the active face box for rendering the lock bracket
  const lockedFaceBoxRef = useRef<{x: number, y: number, w: number, h: number} | null>(null);

  const [debugInfo, setDebugInfo] = useState({ score: 0, x: 0, y: 0, yawRatio: 0 });
  
  const [isBypassed, setIsBypassed] = useState(false);
  const isBypassedRef = useRef(false);

  // Sync bypass ref
  useEffect(() => {
    isBypassedRef.current = isBypassed;
    if (isBypassed) {
        updateStatus('DISABLED');
        setHasPermission(false);
        onFaceDetectedRef.current(true);
    }
  }, [isBypassed]);

  useEffect(() => {
    if (bypassSignal > 0) setIsBypassed(true);
  }, [bypassSignal]);

  // Debug visual refs for drawing outside react cycle if needed
  const landmarksRef = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        // 1. Face Detector
        const fDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU"
          },
          runningMode: "VIDEO"
        });

        setFaceDetector(fDetector);
        setIsInitializing(false);
        // Only leave INITIALIZING; never override NO_PERMISSION or a live status.
        if (trackingStatusRef.current === 'INITIALIZING' && !isBypassedRef.current) {
             updateStatus('SEARCHING');
        }
      } catch (error) {
        // Silent catch for initial load issues if offline
        console.warn('Face detector failed to load', error);
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isBypassed) return;

    let cancelled = false;
    let stream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('mediaDevices unavailable'), { name: 'NotFoundError' });
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
            setHasPermission(true);
            videoRef.current?.play().catch(() => {});
          });
        }
      } catch (err: any) {
        if (cancelled) return;
        // Handle common camera errors gracefully without console spam
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
             // No camera found - quiet fail
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
             // User blocked - quiet fail
        } else {
             // Other error - minimal log
             console.warn("Camera init failed:", err.message);
        }
        updateStatus('NO_PERMISSION');
      }
    };

    if (active && !isBypassed) startWebcam();

    return () => {
        cancelled = true;
        stream?.getTracks().forEach(t => t.stop());
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
    };
  }, [active, isBypassed]);

  const updateStatus = (newStatus: TrackerStatus) => {
      if (trackingStatusRef.current !== newStatus) {
          // Analytics hooks
          if (newStatus === 'OUT_OF_BOUNDS') onTrackingErrorRef.current?.('bounds');
          if (newStatus === 'DISTRACTED') onTrackingErrorRef.current?.('distraction');
          
          trackingStatusRef.current = newStatus;
          setTrackingStatus(newStatus);
          
          // Notify parent of specific status change
          onStatusChangeRef.current?.(newStatus);
      }
  };

  const detectLoop = (time: number) => {
    if (isBypassedRef.current) {
        requestRef.current = requestAnimationFrame(() => detectLoop(performance.now()));
        return;
    }

    if (!faceDetector || !videoRef.current || !hasPermission || !canvasRef.current) {
      if (trackingStatusRef.current !== 'NO_PERMISSION') {
          requestRef.current = requestAnimationFrame(() => detectLoop(performance.now()));
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.videoWidth > 0 && canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Run Detection every ~50ms
    if (time - lastDetectionTimeRef.current > 50) {
      try {
        // --- 1. FACE DETECTION ---
        let isTracked = false;
        let isOutOfBounds = false;
        let isDistracted = false;
        let currentScore = 0;
        let faceBox = null;
        let yawRatio = 0;

        const faceResult = faceDetector.detectForVideo(video, time);
        
        if (faceResult.detections.length > 0) {
          // SINGLE PERSON CONSTRAINT:
          // If multiple faces are detected, select the one with the largest bounding box area.
          // This assumes the operator is closest to the camera (primary user).
          let face = faceResult.detections[0];
          
          if (faceResult.detections.length > 1) {
              face = faceResult.detections.reduce((prev, current) => {
                  const prevArea = prev.boundingBox ? prev.boundingBox.width * prev.boundingBox.height : 0;
                  const currArea = current.boundingBox ? current.boundingBox.width * current.boundingBox.height : 0;
                  return (currArea > prevArea) ? current : prev;
              });
          }

          const score = face.categories[0].score;
          currentScore = score;

          if (score >= config.faceConfidenceThreshold) {
            faceBox = face.boundingBox;
            if (faceBox) {
               // Update the ref for rendering the lock bracket
               lockedFaceBoxRef.current = {
                   x: faceBox.originX,
                   y: faceBox.originY,
                   w: faceBox.width,
                   h: faceBox.height
               };

               const centerX = faceBox.originX + (faceBox.width / 2);
               const centerY = faceBox.originY + (faceBox.height / 2);
               
               // Dynamic Safe Zone
               const safeW = video.videoWidth * config.safeZoneScale;
               const safeH = video.videoHeight * config.safeZoneScale;
               const safeX = (video.videoWidth - safeW) / 2;
               const safeY = (video.videoHeight - safeH) / 2;

               if (centerX >= safeX && centerX <= safeX + safeW && centerY >= safeY && centerY <= safeY + safeH) {
                 isTracked = true;
               } else {
                 isOutOfBounds = true;
               }
               
               // Attention Check
               if (config.enableAttentionCheck && face.keypoints && face.keypoints.length >= 3) {
                   const rightEye = face.keypoints[0];
                   const leftEye = face.keypoints[1];
                   const nose = face.keypoints[2];
                   
                   landmarksRef.current = [rightEye, leftEye, nose];
                   
                   let reX = rightEye.x < 2 ? rightEye.x * video.videoWidth : rightEye.x;
                   let leX = leftEye.x < 2 ? leftEye.x * video.videoWidth : leftEye.x;
                   let nX = nose.x < 2 ? nose.x * video.videoWidth : nose.x;

                   const eyeDist = Math.abs(leX - reX);
                   const eyeMidX = (leX + reX) / 2;
                   const noseOffset = nX - eyeMidX;
                   
                   yawRatio = noseOffset / (eyeDist || 1);
                   
                   if (Math.abs(yawRatio) > config.attentionSensitivity) {
                       isDistracted = true;
                       isTracked = false;
                   }
               } else {
                   landmarksRef.current = [];
               }
               
               // Only update debug info state if overlay is visible to reduce re-renders
               if (config.showDebugOverlay) {
                  setDebugInfo({ score, x: centerX, y: centerY, yawRatio });
               }
            }
          }
        } else {
            landmarksRef.current = [];
            lockedFaceBoxRef.current = null;
        }

        // Update Status
        if (isDistracted) updateStatus('DISTRACTED');
        else if (isTracked) updateStatus('TRACKING');
        else if (isOutOfBounds) updateStatus('OUT_OF_BOUNDS');
        else updateStatus('SEARCHING');

        // Always call callback via ref
        // For general "Face Detected" logic, we consider 'TRACKING' as detected.
        // 'DISTRACTED' counts as detected physically, but not attentionally.
        // The parent determines if distraction counts as a 'Loss'.
        onFaceDetectedRef.current(isTracked && !isDistracted);
        lastDetectionTimeRef.current = time;

      } catch (e) {
        // Silent catch for frame drop errors
      }
    }

    // --- 3. RENDERING ---
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const safeW = canvas.width * config.safeZoneScale;
      const safeH = canvas.height * config.safeZoneScale;
      const safeX = (canvas.width - safeW) / 2;
      const safeY = (canvas.height - safeH) / 2;

      // Draw Safe Zone
      ctx.strokeStyle = trackingStatusRef.current === 'TRACKING' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.5)';
      if (trackingStatusRef.current === 'DISTRACTED') ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(safeX, safeY, safeW, safeH);
      ctx.setLineDash([]);

      // DRAW OPERATOR LOCK BRACKET (Visual confirmation of Single Person Tracking)
      if (lockedFaceBoxRef.current && trackingStatusRef.current === 'TRACKING') {
          const lb = lockedFaceBoxRef.current;
          // Scale from video coords to canvas coords if needed (usually they match if sized correctly)
          const fx = lb.x * canvas.width / video.videoWidth;
          const fy = lb.y * canvas.height / video.videoHeight;
          const fw = lb.w * canvas.width / video.videoWidth;
          const fh = lb.h * canvas.height / video.videoHeight;

          ctx.strokeStyle = '#22c55e'; // Green lock
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          
          // Bracket corners
          const len = fw * 0.2;
          ctx.beginPath();
          // Top Left
          ctx.moveTo(fx, fy + len); ctx.lineTo(fx, fy); ctx.lineTo(fx + len, fy);
          // Top Right
          ctx.moveTo(fx + fw - len, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw, fy + len);
          // Bottom Right
          ctx.moveTo(fx + fw, fy + fh - len); ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx + fw - len, fy + fh);
          // Bottom Left
          ctx.moveTo(fx + len, fy + fh); ctx.lineTo(fx, fy + fh); ctx.lineTo(fx, fy + fh - len);
          ctx.stroke();

          // Label
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText("OPERATOR", fx, fy - 5);
      }

      // Draw Debug Overlay
      if (config.showDebugOverlay) {
         if (landmarksRef.current.length > 0) {
             const [re, le, n] = landmarksRef.current;
             const scaleX = (val: number) => val < 2 ? val * canvas.width : val;
             const scaleY = (val: number) => val < 2 ? val * canvas.height : val;
             
             ctx.fillStyle = trackingStatusRef.current === 'DISTRACTED' ? 'red' : '#00ff00';
             [re, le, n].forEach(pt => {
                 ctx.beginPath();
                 ctx.arc(scaleX(pt.x), scaleY(pt.y), 3, 0, Math.PI*2);
                 ctx.fill();
             });
             
             const nX = scaleX(n.x);
             const nY = scaleY(n.y);
             // Use debugInfo state here since it's only updated when overlay is on
             const gazeX = nX + (debugInfo.yawRatio * 200); 
             
             ctx.strokeStyle = 'cyan';
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(nX, nY);
             ctx.lineTo(gazeX, nY);
             ctx.stroke();
         }
      }
    }

    requestRef.current = requestAnimationFrame(() => detectLoop(performance.now()));
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(() => detectLoop(performance.now()));
    return () => cancelAnimationFrame(requestRef.current);
  }, [faceDetector, hasPermission, config, isBypassed]); // removed dependencies that change too often

  const getStatusColor = () => {
    switch(trackingStatus) {
      case 'TRACKING': return 'text-green-400';
      case 'OUT_OF_BOUNDS': return 'text-yellow-400';
      case 'DISTRACTED': return 'text-red-500';
      case 'DISABLED': return 'text-blue-400';
      default: return 'text-red-400';
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-slate-700 shadow-lg group">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${config.showCameraFeed && !isBypassed ? 'opacity-80' : 'opacity-0'}`} 
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      
      {/* Error / Bypass UI */}
      {trackingStatus === 'NO_PERMISSION' && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="bg-red-500/10 p-4 rounded-full mb-3 border border-red-500/30">
            <VideoOff size={24} className="text-red-500" />
          </div>
          <h3 className="text-white font-bold mb-1 tracking-wide">CAMERA DENIED</h3>
          <p className="text-slate-400 text-[10px] mb-6 leading-relaxed max-w-[200px]">
            Check permissions or bypass sensors to play manually.
          </p>
          
          <div className="flex gap-2 w-full">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded text-[10px] font-bold border border-slate-600 transition-colors"
              >
                RETRY
              </button>
              <button 
                onClick={() => setIsBypassed(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-[10px] font-bold shadow-lg shadow-blue-500/20 transition-colors"
              >
                BYPASS
              </button>
          </div>
        </div>
      )}

      {/* Bypass Visual */}
      {isBypassed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
            <ShieldAlert size={32} className="text-blue-500 mb-2" />
            <span className="text-blue-400 font-bold tracking-widest text-[10px]">SENSORS BYPASSED</span>
        </div>
      )}

      {/* HUD */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
         {isInitializing && !isBypassed && trackingStatus !== 'NO_PERMISSION' && <Loader2 className="animate-spin text-blue-500" />}
         
         {!isInitializing && trackingStatus !== 'NO_PERMISSION' && (
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                {/* Face Status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded bg-black/50 backdrop-blur border border-white/10`}>
                   {trackingStatus === 'TRACKING' ? <Lock size={12} className="text-green-400" /> : 
                    trackingStatus === 'DISTRACTED' ? <AlertTriangle size={12} className={getStatusColor()} /> :
                    trackingStatus === 'DISABLED' ? <ShieldAlert size={12} className={getStatusColor()} /> :
                    <Scan size={12} className={getStatusColor()} />}
                   <span className={`text-[10px] font-bold ${getStatusColor()}`}>
                     {trackingStatus.replace('_', ' ')}
                   </span>
                </div>
            </div>
         )}

         {/* Center Hint */}
         {!config.showCameraFeed && !config.showDebugOverlay && !isBypassed && trackingStatus !== 'NO_PERMISSION' && (
           <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Scan size={48} className="text-white" />
           </div>
         )}
         
         {trackingStatus === 'OUT_OF_BOUNDS' && (
           <div className="absolute bottom-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-yellow-400 animate-pulse">
             CENTER FACE
           </div>
         )}

         {trackingStatus === 'DISTRACTED' && (
           <div className="absolute bottom-2 bg-red-900/80 px-2 py-1 rounded text-[10px] font-bold text-white animate-pulse border border-red-500">
             EYES ON SCREEN
           </div>
         )}
      </div>
    </div>
  );
};

export default WebcamTracker;

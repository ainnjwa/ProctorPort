import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Activity, Mic, Video, ShieldCheck, AlertCircle } from 'lucide-react';
import { db } from '../../Config/firebase';
import './AIMonitor.css';

const AIMonitor = ({ examId, studentId, onViolation, onReadyChange }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [lastFrameData, setLastFrameData] = useState(null);
  const [envStatus, setEnvStatus] = useState("Checking environment...");
  const auth = getAuth();

  const lastLogTime = useRef(0);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const baselineNoise = useRef(0);
  const calibrationFrames = useRef([]);
  const violationCounters = useRef({ movement: 0, talking: 0 });

  useEffect(() => {
    const startMonitoring = async () => {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = videoStream;

        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setupAudioAnalysis(audioStream);

        setIsMonitoring(true);
        
        // 5-Second Calibration Phase
        setTimeout(() => {
          const avgNoise = calibrationFrames.current.reduce((a, b) => a + b, 0) / Math.max(1, calibrationFrames.current.length);
          baselineNoise.current = avgNoise;
          
          // Readiness Logic
          if (avgNoise > 800) {
            setEnvStatus("Environment too noisy/shaky");
            if(onReadyChange) onReadyChange(false, "Too much background movement/noise.");
          } else {
            setEnvStatus("Ready");
            setIsCalibrating(false);
            if(onReadyChange) onReadyChange(true);
          }
        }, 5000);

      } catch (err) {
        setEnvStatus("Hardware Access Denied");
        if(onReadyChange) onReadyChange(false, "Camera/Mic access required.");
      }
    };

    startMonitoring();
    return () => {
      videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
      audioContext.current?.close();
    };
  }, []);

  const setupAudioAnalysis = (stream) => {
    audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.current.createMediaStreamSource(stream);
    analyser.current = audioContext.current.createAnalyser();
    analyser.current.fftSize = 256;
    source.connect(analyser.current);
  };

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      const movement = analyzeFrame();
      const volume = analyzeAudio();
      if (!isCalibrating) processDetections(movement, volume);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMonitoring, lastFrameData, isCalibrating]);

  const analyzeAudio = () => {
    if (!analyser.current) return 0;
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);
    return dataArray.reduce((a, b) => a + b) / dataArray.length;
  };

  const analyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return { score: 0, zones: { l: 0, r: 0 }, avgB: 100 };
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 50, 50);
    const currentFrame = ctx.getImageData(0, 0, 50, 50).data;

    let weightedScore = 0;
    let leftZone = 0, rightZone = 0, totalBrightness = 0;

    if (lastFrameData) {
      for (let i = 0; i < currentFrame.length; i += 4) {
        const diff = Math.abs(currentFrame[i] - lastFrameData[i]);
        totalBrightness += currentFrame[i];
        if (diff > 35) {
          const x = (i / 4) % 50;
          const y = Math.floor((i / 4) / 50);
          const isCenter = x > 15 && x < 35 && y > 10 && y < 40;
          weightedScore += isCenter ? 2.0 : 0.5;
          if (x < 15) leftZone++;
          if (x > 35) rightZone++;
        }
      }
    }
    setLastFrameData(currentFrame);
    if (isCalibrating) calibrationFrames.current.push(weightedScore);
    return { score: weightedScore, zones: { l: leftZone, r: rightZone }, avgB: totalBrightness / 2500 };
  };

  const processDetections = (movement, volume) => {
    // 1. Hierarchy: Visibility Check
    if (movement.avgB < 8) {
      handleViolation("Camera Obscured / Room Too Dark", 95);
      return;
    }

    const trueMovement = Math.max(0, movement.score - baselineNoise.current);
    const isMoving = trueMovement > 350;
    const isTalking = volume > 45;

    // 2. Hierarchy: Physical Movement & Correlation
    if (isMoving) {
      violationCounters.current.movement++;
      if (violationCounters.current.movement >= 2) {
        if (isTalking) {
          handleViolation("Simultaneous Movement & Talking", 99);
          violationCounters.current.movement = 0;
          return;
        }
        const conf = Math.min(Math.max(Math.floor((trueMovement / 1000) * 100), 70), 98);
        handleViolation("Excessive Movement", conf);
        violationCounters.current.movement = 0;
      }
    } else { violationCounters.current.movement = 0; }

    // 3. Hierarchy: Zone-based Head Movement
    if ((movement.zones.l > 60 || movement.zones.r > 60) && trueMovement < 400) {
      handleViolation("Looking Away from Screen", 80);
      return;
    }

    // 4. Hierarchy: Audio Check
    if (isTalking) {
      violationCounters.current.talking++;
      if (violationCounters.current.talking >= 2) {
        handleViolation("Talking Detected", 85);
        violationCounters.current.talking = 0;
      }
    } else { violationCounters.current.talking = 0; }
  };

  const handleViolation = async (type, confidence) => {
    const now = Date.now();
    if (now - lastLogTime.current < 5000) return;
    lastLogTime.current = now;
    onViolation(type);
    try {
      await addDoc(collection(db, 'violations'), {
        examId, studentId, type_of_violation: type,
        confidence_score: confidence, timestamp: serverTimestamp(),
        studentUid: auth.currentUser?.uid || "anon"
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="ai-monitor-container">
      <div className="ai-status-bar">
        {isCalibrating ? (
          <div className="status-item text-yellow-500">
            <ShieldCheck size={12} className="animate-spin" />
            <span>{envStatus}</span>
          </div>
        ) : (
          <div className="status-item text-green-400">
            <Activity size={12} className="animate-pulse" />
            <span>AI MONITOR ACTIVE</span>
          </div>
        )}
      </div>
      <video ref={videoRef} autoPlay muted className="video-feed" />
      <canvas ref={canvasRef} width="50" height="50" className="hidden" />
    </div>
  );
};

export default AIMonitor;
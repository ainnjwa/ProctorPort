import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Activity, Zap } from 'lucide-react';
import { db } from '../../Config/firebase';
import './AIMonitor.css';

const AIMonitor = ({ examId, studentId, onViolation }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastFrameData, setLastFrameData] = useState(null);
  const auth = getAuth();
  
  // Rate limiter: Prevent spamming DB (1 log per 3 seconds max)
  const lastLogTime = useRef(0);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsMonitoring(true);
      }
    } catch (err) {
      console.error("Camera Error:", err);
      onViolation("Camera Disconnected");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsMonitoring(false);
  };

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => detectMotion(), 1000);
    return () => clearInterval(interval);
  }, [isMonitoring, lastFrameData]);

  const detectMotion = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Use a small grid (50x50) for performance
    ctx.drawImage(video, 0, 0, 50, 50);
    const currentFrameData = ctx.getImageData(0, 0, 50, 50).data;

    if (lastFrameData) {
      let diffScore = 0;
      let leftZone = 0;
      let rightZone = 0;
      
      for (let i = 0; i < currentFrameData.length; i += 4) {
        const diff = Math.abs(currentFrameData[i] - lastFrameData[i]);
        if (diff > 30) {
          diffScore++; // Threshold lowered for better sensitivity

          // --- ZONE DETECTION (For looking sideways) ---
          const pixelIndex = i / 4;
          const x = pixelIndex % 50; // Get X coordinate (0-50)
          
          if (x < 15) leftZone++;       // Left 30% of screen
          if (x > 35) rightZone++;      // Right 30% of screen
        }
      }

      // If movement is high on edges but low in total, user is turning head
      if ((leftZone > 40 || rightZone > 40) && diffScore < 300) {
         handleViolation("Suspicious Head Movement / Looking Away", 75);
         setLastFrameData(currentFrameData);
         return; // Exit to avoid double logging
      }

      // excessive body movement
      if (diffScore > 300) {
        let rawConfidence = Math.floor((diffScore / 1000) * 100);
        // Clamp between 60% and 99%
        let confidence = Math.min(Math.max(rawConfidence, 60), 99); 
        
        handleViolation("Excessive Movement", confidence);
      }

      // --- DARKNESS / CAMERA COVERED ---
      let totalBrightness = 0;
      for (let i = 0; i < currentFrameData.length; i += 4) {
          totalBrightness += currentFrameData[i];
      }
      const avgBrightness = totalBrightness / (currentFrameData.length / 4);
      
      if (avgBrightness < 10) {
         handleViolation("Camera Obscured / Low Light", 95);
      }
    }

    setLastFrameData(currentFrameData);
  };

  const handleViolation = async (type, confidenceScore) => {
    // Throttling to prevent DB spam
    const now = Date.now();
    if (now - lastLogTime.current < 3000) return;
    lastLogTime.current = now;

    console.log(`LOGGING VIOLATION: ${type} (${confidenceScore}%)`);
    onViolation(type);

    try {
      const uid = auth.currentUser.uid || "anonymous";
      
      // Get student email or ID
      const displayId = studentId || 'Unknown Student';

      // write to 'violations' in database
      await addDoc(collection(db, 'violations'), {
        examId: examId || "test-exam",
        studentId: displayId,
        studentUid: uid,
        type_of_violation: type,
        confidence_score: confidenceScore, 
        timestamp: serverTimestamp(),
        detected_by_AI: true,
        isResolved: false
      });
      console.log("SUCCESS: Violation written to Firestore");
    } catch (error) {
      console.error("ERROR logging violation:", error);
      alert("Database Write Failed! Ask Admin to check Console.");
    }
  };

  return (
    <div className="ai-monitor-container">
      <div className="ai-badge">
        <Activity size={12} className="animate-pulse" /> AI PROCTOR ACTIVE
      </div>
      <video ref={videoRef} autoPlay muted className="video-feed" />
      <canvas ref={canvasRef} width="50" height="50" className="hidden" />
    </div>
  );
};

export default AIMonitor;
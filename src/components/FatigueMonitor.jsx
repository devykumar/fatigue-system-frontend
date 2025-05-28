// components/FatigueMonitor.js
import React, { useEffect, useRef, useState } from 'react';

const FatigueMonitor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('Waiting...');
  const [drowsyImage, setDrowsyImage] = useState(null);
  const ws = useRef(null);

  useEffect(() => {
    // Start webcam
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    // Open WebSocket
    ws.current = new WebSocket('wss://fatigue-backend-app-geege8hxdnccchca.canadacentral-01.azurewebsites.net/ws/fatigue');
    // ws.current = new WebSocket('ws://localhost:8000/ws/fatigue');
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status || 'Unknown');
      if (data.image_base64) {
        setDrowsyImage(`data:image/jpeg;base64,${data.image_base64}`);
      }
    };

    // Send frames periodically
    const interval = setInterval(() => {
      captureAndSendFrame();
    }, 2000);

    return () => {
      clearInterval(interval);
      if (ws.current) ws.current.close();
    };
  }, []);

  const captureAndSendFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob && ws.current && ws.current.readyState === WebSocket.OPEN) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1]; // Remove prefix
          ws.current.send(
              JSON.stringify({
                  image_base64: base64data,
                  driver_id: 12345
              })
          );
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg');
  };

  return (
    <div>
      <h2>Fatigue Monitor</h2>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 500 }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div>Status: <strong>{status}</strong></div>
      {drowsyImage && (
        <div>
          <h4>Drowsy Snapshot:</h4>
          <img src={drowsyImage} alt="Drowsy capture" style={{ width: 300 }} />
        </div>
      )}
    </div>
  );
};

export default FatigueMonitor;


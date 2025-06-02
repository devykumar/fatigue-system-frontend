import React, { useEffect, useRef, useState } from 'react';

const FatigueMonitor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(new Audio('/beep.mp3')); // Ensure beep.mp3 is in public folder
  const [status, setStatus] = useState('Waiting...');
  const [drowsyImage, setDrowsyImage] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const ws = useRef(null);

  // Driver options for dropdown
  const driverOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `Driver ${i + 1}`,
  }));

  useEffect(() => {
    if (!driverId) return; // Only proceed if driver is selected

    // Start webcam
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    // Open WebSocket
    ws.current = new WebSocket('wss://fatigue-backend-app-geege8hxdnccchca.canadacentral-01.azurewebsites.net/ws/fatigue');
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status || 'Unknown');
      if (data.image_base64) {
        setDrowsyImage(`data:image/jpeg;base64,${data.image_base64}`);
      }
      // Play beep sound when status is drowsy
      if (data.status === 'drowsy') {
        audioRef.current.play().catch((error) => console.error('Audio play failed:', error));
      }
    };

    // Send frames periodically
    const interval = setInterval(() => {
      captureAndSendFrame();
    }, 2000);

    return () => {
      clearInterval(interval);
      if (ws.current) ws.current.close();
      // Stop webcam stream on cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [driverId]);

  const captureAndSendFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !driverId) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob && ws.current && ws.current.readyState === WebSocket.OPEN) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          ws.current.send(
            JSON.stringify({
              image_base64: base64data,
              driver_id: driverId,
            })
          );
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg');
  };

  const handleDriverSelect = (event) => {
    setDriverId(parseInt(event.target.value));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#e6f4ea',
        padding: '20px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {!driverId ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '100%',
          }}
        >
          <h2 style={{ color: '#2e7d32', marginBottom: '20px' }}>Select Driver</h2>
          <select
            onChange={handleDriverSelect}
            value={driverId || ''}
            style={{
              padding: '10px',
              fontSize: '16px',
              borderRadius: '5px',
              border: '2px solid #4caf50',
              backgroundColor: '#f1f8e9',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>
              Select a driver
            </option>
            {driverOptions.map((driver) => (
              <option key={driver.value} value={driver.value}>
                {driver.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <h2 style={{ color: '#2e7d32', marginBottom: '10px' }}>Fatigue Monitor</h2>
          <div style={{ marginBottom: '15px', color: '#1b5e20', fontWeight: 'bold' }}>
            Driver ID: {driverId}
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxWidth: '500px',
                display: 'block',
                margin: '0 auto',
                border: '3px solid #4caf50',
                borderRadius: '10px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              }}
            />
            {status === 'drowsy' && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(211, 47, 47, 0.9)', // Red warning
                  color: '#ffffff',
                  padding: '25px',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  textAlign: 'center',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                WARNING: Drowsy Detected!
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ marginTop: '20px', color: '#1b5e20', fontSize: '18px' }}>
            Status: <strong>{status}</strong>
          </div>
          {drowsyImage && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <h4 style={{ color: '#2e7d32' }}>Drowsy Snapshot:</h4>
              <img
                src={drowsyImage}
                alt="Drowsy capture"
                style={{
                  width: '300px',
                  border: '2px solid #4caf50',
                  borderRadius: '5px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FatigueMonitor;
import React, { useState } from 'react';
import { Maximize2, RotateCw, Wifi, WifiOff, Radio, ExternalLink } from 'lucide-react';

/* ─────────────────────────────────────────────
   Camera Feed — renders MJPEG stream from AI engine
   streamUrl: http://localhost:5002/video_feed/0
───────────────────────────────────────────── */
function CameraFeed({ id, name, zone, streamUrl, fullWidth = false }) {
    const [isOnline, setIsOnline] = useState(true);
    const containerRef = React.useRef(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div
            ref={containerRef}
            className="bg-black rounded-xl overflow-hidden relative group shadow-2xl border border-gray-700"
        >
            {/* Camera Header */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 to-transparent z-10 flex justify-between items-start">
                <div>
                    <h3 className="text-white font-bold text-base tracking-wide">{name}</h3>
                    <p className="text-gray-400 text-xs">{zone}</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md
                    ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs font-mono font-bold">{isOnline ? 'LIVE' : 'OFFLINE'}</span>
                </div>
            </div>

            {/* Video Feed */}
            <div
                className={`bg-gray-900 flex items-center justify-center relative overflow-hidden
                    ${fullWidth ? 'aspect-[16/9]' : 'aspect-video'}`}
                style={fullWidth ? { minHeight: '480px' } : {}}
            >
                {streamUrl ? (
                    /* MJPEG stream from AI engine Flask server */
                    <img
                        src={streamUrl}
                        alt={name}
                        className="w-full h-full object-contain"
                        onError={() => setIsOnline(false)}
                        onLoad={() => setIsOnline(true)}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-4 text-gray-600">
                        <WifiOff size={64} />
                        <p className="text-sm">No stream source configured</p>
                    </div>
                )}

                {/* Overlay — timestamp + fps */}
                <div className="absolute bottom-4 left-4 font-mono text-green-400 text-xs opacity-80 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    {isOnline ? (
                        <>
                            REC • {new Date().toLocaleTimeString()} <br />
                            <span className="text-gray-400">AI Enhanced • YOLOv8</span>
                        </>
                    ) : (
                        <span className="text-red-400">SIGNAL LOST — Start camera below ↓</span>
                    )}
                </div>
            </div>

            {/* Fullscreen button */}
            <div className="absolute bottom-4 right-4">
                <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-white/10 hover:bg-white/25 rounded-lg text-white backdrop-blur-sm transition active:scale-95"
                    title="Fullscreen"
                >
                    <Maximize2 size={18} />
                </button>
            </div>
        </div>
    );
}



/* ─────────────────────────────────────────────
   CCTV Monitor Page
───────────────────────────────────────────── */
function CameraMonitor() {
    const cameras = [{
        id: 1,
        name: 'CAM-01',
        zone: 'Main Gate',
        streamUrl: 'http://localhost:5002/video_feed/0',
    }];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CCTV Monitor</h1>
                    <p className="text-sm text-gray-500">Live AI-Enhanced Video Feeds</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    title="Refresh Feeds"
                >
                    <RotateCw size={20} className="text-gray-500" />
                </button>
            </div>

            {/* Main layout: full width cameras */}
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                    {cameras.map(cam => (
                        <CameraFeed key={cam.id} {...cam} fullWidth />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CameraMonitor;

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, RotateCcw, Edit3, Eye, EyeOff, Sparkles, Clock, Monitor, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';

export default function TimelinePreview({ projectId, refreshTs, onEditAsset }) {
    const [timeline, setTimeline] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [loading, setLoading] = useState(true);

    const playbackRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        fetchTimeline();
    }, [projectId, refreshTs]);

    const fetchTimeline = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/timeline/preview`);
            const data = await res.json();
            if (data.segments) {
                setTimeline(data);
            }
        } catch (e) {
            console.error("Timeline Preview Load Failed", e);
        } finally {
            setLoading(false);
        }
    };

    // Playback Logic
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.play().catch(e => console.warn("Audio play blocked", e));
            playbackRef.current = setInterval(() => {
                setCurrentTime(audio.currentTime);
                if (audio.ended) {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    audio.currentTime = 0;
                }
            }, 50);
        } else {
            audio.pause();
            if (playbackRef.current) clearInterval(playbackRef.current);
        }
        return () => { if (playbackRef.current) clearInterval(playbackRef.current); };
    }, [isPlaying, timeline]);

    // Handle Seek
    const seekTo = (time) => {
        const audio = audioRef.current;
        if (audio) {
            audio.currentTime = time;
        }
        setCurrentTime(time);
    };

    // Sync selected segment with current time
    useEffect(() => {
        if (!timeline) return;
        const idx = timeline.segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
        if (idx !== -1 && idx !== selectedSegmentIdx) {
            setSelectedSegmentIdx(idx);
        }
    }, [currentTime, timeline]);

    if (loading || !timeline) {
        return (
            <div className="h-[800px] w-full bg-gray-950 flex flex-col items-center justify-center border-t border-gray-800">
                <Monitor className="text-gray-800 mb-4 animate-pulse" size={48} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Initializing Vision Stream...</p>
            </div>
        );
    }

    const currentSegment = timeline.segments[selectedSegmentIdx];
    const assetUrl = currentSegment ? `${API_URL}${currentSegment.image_url}?t=${refreshTs}` : '';

    const getKenBurnsTransform = () => {
        if (!currentSegment || !currentSegment.ken_burns?.enabled) return 'scale(1)';

        const preset = currentSegment.ken_burns.preset || 'subtle';
        const segTime = currentTime - currentSegment.start;
        const progress = Math.max(0, Math.min(1, segTime / currentSegment.duration));

        // Easing (easeInOutQuad)
        const t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        let scale = 1.0;
        let x = 0;
        let y = 0;

        if (preset === 'subtle') {
            scale = 1.0 + (0.07 * t);
        } else if (preset === 'zoom_in') {
            scale = 1.0 + (0.15 * t);
        } else if (preset === 'zoom_out') {
            scale = 1.15 - (0.15 * t);
        } else if (preset === 'pan_left_right') {
            scale = 1.3;
            x = -11.5 + (23 * t); // Pan more dramatically to match the new 1.3 zoom
        } else if (preset === 'pan_bottom_top') {
            scale = 1.3;
            y = 11.5 - (23 * t); // Pan more dramatically to match the new 1.3 zoom
        }

        // Smart Direction (ROI Aware)
        // If we have ROI, we override the center (0,0) to target the subject
        if (currentSegment.crop_data?.roi && ['subtle', 'zoom_in', 'zoom_out'].includes(preset)) {
            const roi = currentSegment.crop_data.roi;
            // ROI is often in 0-1000 scale from Cloud Vision, let's normalize to 0-1
            const centerX = (roi.xmin + roi.xmax) / 2000;
            const centerY = (roi.ymin + roi.ymax) / 2000;

            // Calculate how much we can move while staying within the zoomed frame
            // Max movement is (scale - 1.0) / 2 * 100 in %
            const maxOffset = ((scale - 1.0) / 2) * 100;

            // Target the ROI center by shifting the image in the opposite direction
            const targetX = (0.5 - centerX) * maxOffset * 2;
            const targetY = (0.5 - centerY) * maxOffset * 2;

            // Apply over time
            x = targetX * t;
            y = targetY * t;
        }

        return `scale(${scale}) translate(${x}%, ${y}%)`;
    };

    return (
        <div className="h-[850px] flex flex-col bg-[#050505] select-none overflow-hidden relative border border-white/5 rounded-[2rem] shadow-2xl">
            {/* 1. TOP PREVIEW AREA */}
            <div className="flex-1 relative flex items-center justify-center p-12 min-h-0 bg-black/40">

                {/* HUD Overlay (Left) */}
                <div className="absolute top-10 left-10 flex flex-col gap-5 z-50">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl min-w-[240px]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.8)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Vision Stream</span>
                            {currentSegment?.ken_burns?.enabled && (
                                <div className="ml-auto px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30 text-[7px] font-black tracking-widest flex items-center gap-1">
                                    <Sparkles size={8} /> MOTION
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-6">
                                <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Asset</span>
                                <span className="text-[9px] text-blue-400 font-mono truncate max-w-[120px]">{currentSegment?.image}</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Time</span>
                                <span className="text-[9px] text-white/90 font-mono italic">{currentTime.toFixed(2)}s / {timeline.total_duration.toFixed(2)}s</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowOverlay(!showOverlay)}
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${showOverlay ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/40'
                            }`}
                    >
                        {showOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
                        {showOverlay ? 'Vision Analysis ON' : 'Vision Analysis OFF'}
                    </button>
                </div>

                {/* THE 9:16 PREVIEW BOX */}
                <div className="h-full max-h-full flex items-center justify-center relative z-20 group">
                    <div className="h-full aspect-[9/16] bg-[#0a0a0a] rounded-[3rem] border-8 border-[#1a1a1a] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden relative">
                        {/* THE ACTUAL MEDIA */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform-gpu overflow-hidden">
                            <div
                                className="w-full h-full relative transition-transform duration-75 ease-linear"
                                style={{ transform: getKenBurnsTransform() }}
                            >
                                {currentSegment?.image?.toLowerCase().match(/\.(mp4|webm)$/) ? (
                                    <video
                                        key={assetUrl}
                                        src={assetUrl}
                                        className="w-full h-full object-cover block"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        key={assetUrl}
                                        src={assetUrl}
                                        className="w-full h-full object-cover block"
                                        onLoad={() => console.log("SUCCESS: Image rendered", assetUrl)}
                                        onError={(e) => console.error("FAILURE: Image failed", e.target.src)}
                                    />
                                )}
                            </div>

                            {/* Darkening layer */}
                            {showOverlay && <div className="absolute inset-0 bg-black/30 backdrop-contrast-125"></div>}
                        </div>

                        {/* Vision Analysis boxes */}
                        {showOverlay && currentSegment?.dimensions?.w > 0 && currentSegment.crop_data?.roi && (
                            <div className="absolute inset-0 pointer-events-none z-30">
                                <div
                                    className="absolute border-2 border-dashed border-blue-400/60 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-500/5"
                                    style={{
                                        top: `${currentSegment.crop_data.roi.ymin / 10}%`,
                                        left: `${currentSegment.crop_data.roi.xmin / 10}%`,
                                        width: `${(currentSegment.crop_data.roi.xmax - currentSegment.crop_data.roi.xmin) / 10}%`,
                                        height: `${(currentSegment.crop_data.roi.ymax - currentSegment.crop_data.roi.ymin) / 10}%`,
                                    }}
                                >
                                    <div className="absolute -top-6 left-0 flex items-center gap-1.5 px-2 py-1 bg-blue-600 rounded text-[7px] font-black text-white uppercase whitespace-nowrap shadow-lg">
                                        <Sparkles size={8} /> Detected {currentSegment.crop_data.type}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hover Actions */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 z-40 backdrop-blur-sm">
                            <button
                                onClick={() => onEditAsset(currentSegment.image)}
                                className="p-5 bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-2xl"
                            >
                                <Edit3 size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* HUD Overlay (Right) */}
                <div className="absolute bottom-10 right-10 max-w-[320px] z-50">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-7 shadow-2xl">
                        <div className="flex items-center gap-3 mb-5">
                            {currentSegment.crop_data ? (
                                <div className="p-2 bg-blue-500/20 rounded-xl"><Sparkles className="text-blue-400" size={20} /></div>
                            ) : (
                                <div className="p-2 bg-amber-500/20 rounded-xl"><ShieldCheck className="text-amber-400" size={20} /></div>
                            )}
                            <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                                {currentSegment.crop_data ? 'AI Spatial Analysis' : 'Heuristic Frame'}
                            </h4>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                            {currentSegment.crop_data
                                ? `Subject identified as "${currentSegment.crop_data.type}" with ${(currentSegment.crop_data.confidence * 100).toFixed(0)}% spatial weight. Applying 9:16 focus lock.`
                                : "No primary subject isolated. Defaulting to algorithmic center-weighted framing."}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. TIMELINE SCRUBBER AREA */}
            <div className="h-48 bg-black/60 backdrop-blur-3xl border-t border-white/5 p-10 flex flex-col gap-6 relative z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                        </button>
                        <div className="flex items-center gap-5 text-white/30">
                            <SkipBack size={20} className="cursor-pointer hover:text-white transition-colors" onClick={() => seekTo(0)} title="Reset to Intro" />
                            <SkipForward size={20} className="cursor-pointer hover:text-white transition-colors opacity-50" />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl">
                        <span className="text-[11px] font-black font-mono text-blue-400 tracking-wider">
                            {currentTime.toFixed(2)}s <span className="text-white/20 mx-2">/</span> {timeline.total_duration.toFixed(2)}s
                        </span>
                    </div>
                </div>

                <div className="relative h-14 w-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex cursor-pointer group/timeline shadow-inner">
                    {timeline.segments.map((seg, i) => (
                        <div
                            key={i}
                            onClick={() => { seekTo(seg.start); setIsPlaying(false); }}
                            className={`h-full border-r border-black/40 transition-all relative overflow-hidden flex items-center justify-center ${selectedSegmentIdx === i ? 'bg-blue-600/30' : 'bg-transparent hover:bg-white/5'
                                }`}
                            style={{ width: `${(seg.duration / timeline.total_duration) * 100}%` }}
                        >
                            <img
                                src={`${API_URL}${seg.image_url}?t=${refreshTs}`}
                                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${selectedSegmentIdx === i ? 'opacity-70 scale-105 saturate-150' : 'opacity-20 grayscale'
                                    }`}
                            />
                            <span className={`text-[10px] font-black uppercase z-10 ${selectedSegmentIdx === i ? 'text-white' : 'text-white/20'}`}>{i + 1}</span>
                        </div>
                    ))}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] z-20 pointer-events-none transition-all duration-75"
                        style={{ left: `${(currentTime / timeline.total_duration) * 100}%` }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-500 rounded-b-full shadow-lg"></div>
                    </div>
                </div>
            </div>

            {/* Audio Engine */}
            {timeline.audio_url && (
                <audio ref={audioRef} src={`${API_URL}${timeline.audio_url}?t=${refreshTs}`} onEnded={() => { setIsPlaying(false); setCurrentTime(0); }} />
            )}
        </div>
    );
}

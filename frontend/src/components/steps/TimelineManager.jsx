import React, { useState, useEffect, useRef } from 'react';
import {
    Film, RefreshCw, RotateCcw, Sliders, Music, Edit, Save,
    GripVertical, ChevronUp, ChevronDown, AlertCircle, Maximize2,
    SkipBack, Pause, Play, Square, CheckCircle
} from 'lucide-react';
import { API_URL } from '../../config';

// --- Sub-components (Internal) ---

function TimelinePreview({ projectId, timeline, projectData }) {
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentSegment, setCurrentSegment] = useState(null);
    const imagesRef = useRef({});

    // Preload Images
    useEffect(() => {
        if (!timeline) return;
        if (timeline.segments) {
            timeline.segments.forEach(seg => {
                if (!imagesRef.current[seg.image]) {
                    const img = new Image();
                    img.src = `${API_URL}/media/${projectId}/input/${seg.image}`;
                    imagesRef.current[seg.image] = img;
                }
            });
        }
    }, [projectId, timeline]);

    // Audio Sync
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.currentTime = currentTime;
                audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    // Main Loop
    useEffect(() => {
        let frameId;
        const render = () => {
            if (isPlaying) {
                setCurrentTime(prev => {
                    const next = prev + 1 / 60; // 60 FPS assumption
                    const maxDur = timeline.total_audio_duration || timeline.total_duration || 0;
                    if (next >= maxDur) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return next;
                });
            }

            drawFrame();
            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, timeline, currentTime]);

    const drawFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (!timeline || !timeline.segments || timeline.segments.length === 0) return;

        const seg = timeline.segments.find(s => currentTime >= s.start && currentTime < s.end) || timeline.segments[0];
        setCurrentSegment(seg);

        const img = imagesRef.current[seg.image];
        if (!img || !img.complete) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
            ctx.fillText(`Loading ${seg.image}...`, 20, 20);
            return;
        }

        // Effect Calculation
        const segElapsed = currentTime - seg.start;
        const progress = segElapsed / seg.duration;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        let scale = 1.1; // Baseline zoom for safety
        let tx = 0, ty = 0;

        if (seg.effect === 'zoom_in') scale = 1.1 + (progress * 0.2);
        if (seg.effect === 'zoom_out') scale = 1.3 - (progress * 0.2);
        if (seg.effect === 'pan_left') tx = (progress - 0.5) * 40;
        if (seg.effect === 'pan_right') tx = (0.5 - progress) * 40;

        // Center and draw
        const drawWidth = canvas.width * scale;
        const drawHeight = canvas.height * scale;
        const x = (canvas.width - drawWidth) / 2 + tx;
        const y = (canvas.height - drawHeight) / 2 + ty;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        ctx.restore();

        // Overlay info
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(`${seg.image} | ${seg.effect} | ${(currentTime || 0).toFixed(2)}s / ${(timeline?.total_duration || 0).toFixed(2)}s`, 10, canvas.height - 10);
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) audioRef.current.currentTime = time;
    };

    return (
        <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-4">
                {/* Preview Viewport */}
                <div className="lg:col-span-3 bg-black flex flex-col items-center justify-center p-4 min-h-[400px] relative group">
                    <canvas
                        ref={canvasRef}
                        width={640}
                        height={360}
                        className="w-full h-auto max-w-2xl rounded shadow-2xl border border-gray-800"
                    />
                    <audio
                        ref={audioRef}
                        src={`${API_URL}/media/${projectId}/audio/voice.mp3?t=${new Date(projectData.last_updated).getTime()}`}
                    />

                    {/* Controls Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setCurrentTime(0)} className="text-white hover:text-blue-400 transition"><SkipBack size={20} /></button>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                        </button>
                        <button onClick={() => setIsPlaying(false)} className="text-white hover:text-red-400 transition"><Square size={20} /></button>
                    </div>
                </div>

                {/* Inspector Panel */}
                <div className="lg:col-span-1 bg-gray-800 p-6 border-l border-gray-700">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Maximize2 size={14} /> Inspector
                    </h3>

                    <div className="space-y-6">
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-white/5">
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Active Segment</label>
                            <div className="text-white font-mono text-xs truncate mb-2">{currentSegment?.image || 'None'}</div>
                            <div className="flex gap-2">
                                <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase">{currentSegment?.effect || 'None'}</span>
                                <span className="text-[9px] px-2 py-0.5 rounded bg-gray-700 text-gray-400 font-bold uppercase">{currentSegment?.duration ? currentSegment.duration.toFixed(2) : '0.00'}s</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Playback Progress</span>
                                    <span className="text-xs font-mono text-blue-400 font-bold">{currentTime.toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={timeline?.total_audio_duration || timeline?.total_duration || 100}
                                    step="0.01"
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-700">
                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                <CheckCircle size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Sync Status: OK</span>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                * This is a low-latency canvas simulation. Final video encoding will include high-quality motion interpolation, color grading, and transition smoothing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Timeline Ruler */}
            <div className="bg-gray-950 border-t border-gray-800 overflow-hidden">
                {/* Time Markers */}
                <div className="h-6 border-b border-gray-800 relative flex items-center px-2">
                    {Array.from({ length: Math.ceil(timeline.total_audio_duration || timeline.total_duration || 10) + 1 }, (_, i) => {
                        const totalDur = timeline.total_audio_duration || timeline.total_duration || 1;
                        const position = (i / totalDur) * 100;
                        return (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 flex flex-col items-center"
                                style={{ left: `${position}%` }}
                            >
                                <div className="w-px h-2 bg-gray-600"></div>
                                <span className="text-[8px] text-gray-500 font-mono mt-0.5">{i}s</span>
                            </div>
                        );
                    })}
                </div>

                {/* Timeline Segments */}
                <div className="h-12 relative flex">
                    {timeline.silence_start_duration > 0 && (
                        <div
                            className="h-full bg-gray-800 border-r-2 border-dashed border-gray-700 flex items-center justify-center relative group/silence"
                            style={{ width: `${(timeline.silence_start_duration / (timeline.total_audio_duration || timeline.total_duration || 1)) * 100}%` }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center opacity-50">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Silence</span>
                            </div>
                        </div>
                    )}

                    {timeline.segments && timeline.segments.map((seg, i) => {
                        const totalDur = timeline.total_audio_duration || timeline.total_duration || 1;
                        const width = (seg.duration / totalDur) * 100;
                        const isActive = currentTime >= seg.start && currentTime < seg.end;
                        const colors = {
                            zoom_in: 'bg-blue-600/40 border-blue-500',
                            zoom_out: 'bg-purple-600/40 border-purple-500',
                            pan_left: 'bg-green-600/40 border-green-500',
                            pan_right: 'bg-orange-600/40 border-orange-500',
                            none: 'bg-gray-600/40 border-gray-500'
                        };
                        const color = colors[seg.effect] || colors.none;

                        return (
                            <div
                                key={i}
                                className={`h-full border-r border-gray-800 transition-all relative group/seg cursor-pointer ${isActive ? 'ring-2 ring-yellow-400 ring-inset' : ''
                                    } ${color}`}
                                style={{ width: `${width}%` }}
                                onClick={() => setCurrentTime(seg.start)}
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                    <span className="text-[8px] text-white font-bold opacity-70 group-hover/seg:opacity-100">
                                        #{i + 1}
                                    </span>
                                    <span className="text-[7px] text-white/60 font-mono">
                                        {seg.duration.toFixed(1)}s
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-white/0 group-hover/seg:bg-white/10 transition-colors"></div>
                            </div>
                        );
                    })}
                </div>

                {/* Playhead */}
                <div className="h-1 bg-gray-800 relative">
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-yellow-400 z-50 transition-all duration-75"
                        style={{ left: `${(currentTime / (timeline.total_audio_duration || timeline.total_duration || 1)) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

function TimelineEditor({ projectId, timeline, onUpdate }) {
    const [segments, setSegments] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);

    const effectOptions = [
        { value: 'zoom_in', label: 'Zoom In', icon: '🔍+' },
        { value: 'zoom_out', label: 'Zoom Out', icon: '🔍-' },
        { value: 'pan_left', label: 'Pan ←', icon: '←' },
        { value: 'pan_right', label: 'Pan →', icon: '→' },
        { value: 'none', label: 'None', icon: '—' }
    ];

    useEffect(() => {
        if (timeline?.segments) {
            setSegments([...timeline.segments]);
            setHasChanges(false);
        }
    }, [timeline]);

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newSegments = [...segments];
        const draggedItem = newSegments[draggedIndex];
        newSegments.splice(draggedIndex, 1);
        newSegments.splice(index, 0, draggedItem);

        setSegments(newSegments);
        setDraggedIndex(index);
        setHasChanges(true);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const moveSegment = (index, direction) => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= segments.length) return;

        const newSegments = [...segments];
        [newSegments[index], newSegments[newIndex]] = [newSegments[newIndex], newSegments[index]];
        setSegments(newSegments);
        setHasChanges(true);
    };

    const updateEffect = (index, newEffect) => {
        const newSegments = [...segments];
        newSegments[index].effect = newEffect;
        setSegments(newSegments);
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const totalDuration = timeline.total_duration || 0;
            const durationPerSegment = segments.length > 0 ? totalDuration / segments.length : 0;

            const updatedSegments = segments.map((seg, idx) => ({
                ...seg,
                start: parseFloat((idx * durationPerSegment).toFixed(2)),
                end: parseFloat(((idx + 1) * durationPerSegment).toFixed(2)),
                duration: parseFloat(durationPerSegment.toFixed(2))
            }));

            const updatedTimeline = {
                ...timeline,
                segments: updatedSegments
            };

            const res = await fetch(`${API_URL}/projects/${projectId}/timeline/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTimeline)
            });

            if (res.ok) {
                setHasChanges(false);
                onUpdate();
            } else {
                alert('Failed to save timeline');
            }
        } catch (err) {
            alert('Error saving timeline');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Edit size={12} /> Segments Editor
                </h3>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {saving ? <RotateCcw size={12} className="animate-spin" /> : <Save size={12} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="text-[9px] text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 font-semibold tracking-wider">
                        <tr>
                            <th className="px-3 py-2 w-8"></th>
                            <th className="px-2 py-2 w-8">#</th>
                            <th className="px-2 py-2">Image Asset</th>
                            <th className="px-2 py-2 w-24">Timing</th>
                            <th className="px-2 py-2 w-32">Visual Effect</th>
                            <th className="px-2 py-2 w-16 text-center">Sort</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                        {segments.map((seg, idx) => (
                            <tr
                                key={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`group hover:bg-blue-50/30 transition-colors cursor-move ${draggedIndex === idx ? 'opacity-40 bg-blue-100' : ''}`}
                            >
                                <td className="px-3 py-2">
                                    <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400" />
                                </td>
                                <td className="px-2 py-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:text-blue-600">
                                        {idx + 1}
                                    </div>
                                </td>
                                <td className="px-2 py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0 shadow-sm">
                                            <img
                                                src={`${API_URL}/media/${projectId}/input/${seg.image}`}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-700 truncate max-w-[180px]" title={seg.image}>
                                            {seg.image}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2 py-2">
                                    <div className="text-[10px] font-mono text-gray-800">
                                        {(seg.start || 0).toFixed(1)} - {(seg.end || 0).toFixed(1)}s
                                    </div>
                                    <div className="text-[9px] text-gray-400 font-medium">
                                        {(seg.duration || 0).toFixed(2)}s duration
                                    </div>
                                </td>
                                <td className="px-2 py-2">
                                    <select
                                        value={seg.effect}
                                        onChange={(e) => updateEffect(idx, e.target.value)}
                                        className="w-full px-2 py-1.5 text-[10px] font-medium border border-gray-200 rounded bg-white hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 cursor-pointer text-gray-700"
                                    >
                                        {effectOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.icon} {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-2 py-2 text-center">
                                    <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveSegment(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 disabled:opacity-0"><ChevronUp size={14} /></button>
                                        <button onClick={() => moveSegment(idx, 'down')} disabled={idx === segments.length - 1} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 disabled:opacity-0"><ChevronDown size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Main Component ---

export default function TimelineManager({ projectId, lastUpdated, projectData, onUpdate }) {
    const [timeline, setTimeline] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchTimeline = async () => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/timeline`);
            if (res.ok) {
                const data = await res.json();
                setTimeline(data);
            } else {
                setTimeline(null);
            }
        } catch (err) {
            console.error("Failed to fetch timeline", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [projectId, lastUpdated]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/timeline/generate`, { method: 'POST' });
            if (res.ok) {
                await fetchTimeline();
                onUpdate();
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to generate timeline");
            }
        } catch (err) {
            alert("Error generating timeline");
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading timeline...</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Film size={28} className="text-blue-600" /> Timeline Director
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Visualize and fine-tune segment timing and effects.</p>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50 transition shadow-lg active:scale-95"
                >
                    {generating ? <RotateCcw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    {timeline ? 'REGENERATE TIMELINE' : 'GENERATE TIMELINE'}
                </button>
            </div>

            {timeline && (
                <TimelinePreview
                    projectId={projectId}
                    timeline={timeline}
                    projectData={projectData}
                />
            )}

            {!timeline ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center">
                    <Film className="text-gray-200 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-gray-600 mb-2">No Timeline Generated</h3>
                    <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                        The timeline synchronizes your images with the voiceover. Generate the initial timeline to start editing.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition"
                    >
                        Generate Initial Timeline
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Summary Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Sliders size={14} /> Timeline Stats
                            </h3>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                    <span className="text-sm text-gray-600 font-medium">Total Duration</span>
                                    <span className="text-lg font-bold text-blue-600 font-mono tracking-tight">{(timeline.total_duration || 0).toFixed(2)}s</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                    <span className="text-sm text-gray-600 font-medium">Image Segments</span>
                                    <span className="text-lg font-bold text-gray-800 font-mono tracking-tight">{timeline.segments?.length || 0}</span>
                                </div>

                                <div className="pt-2">
                                    <h4 className="text-[9px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                        <Music size={12} /> Audio Layers
                                    </h4>
                                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                        <div className="flex justify-between text-[11px] items-center">
                                            <span className="text-gray-500 font-medium">Background Music</span>
                                            <span className="font-mono font-bold text-gray-700 truncate max-w-[120px]" title={timeline.audio?.bgm?.file}>{timeline.audio?.bgm?.file || 'None'}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] items-center">
                                            <span className="text-gray-500 font-medium">Volume</span>
                                            <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${(timeline.audio?.bgm?.volume || 0) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[11px] items-center">
                                            <span className="text-gray-500 font-medium">Auto-Ducking</span>
                                            <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${timeline.audio?.bgm?.ducking ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                                {timeline.audio?.bgm?.ducking ? 'ON' : 'OFF'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Segments Editor */}
                    <div className="lg:col-span-2">
                        <TimelineEditor
                            projectId={projectId}
                            timeline={timeline}
                            onUpdate={fetchTimeline}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

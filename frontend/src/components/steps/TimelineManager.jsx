import React, { useState, useEffect, useRef } from 'react';
import {
    Film, RefreshCw, RotateCcw, Sliders, Music, Edit, Save,
    GripVertical, ChevronUp, ChevronDown, AlertCircle, Maximize2,
    SkipBack, Pause, Play, Square, CheckCircle
} from 'lucide-react';
import { API_URL } from '../../config';

// --- Sub-components (Internal) ---

// --- Visual Bar Component ---
function TimelineVisualBar({ timeline, currentTime, onSeek, onSegmentSelect }) {
    if (!timeline || !timeline.segments) return null;

    const totalDur = timeline.total_audio_duration || timeline.total_duration || 1;
    const segments = timeline.segments; // Use existing segments

    // Helper to get segment type for visualization
    const getSegmentType = (seg, idx) => {
        // Heuristic: If first segment matches intro silence
        if (idx === 0 && Math.abs(seg.duration - timeline.silence_start_duration) < 0.1) return 'INTRO';
        // Heuristic: If last segment and is mostly covering end silence? (Simpler: just mark last as Outro if it's the very end)
        // But typically the last image IS the content. Let's strictly follow the content.
        // The user wants "Intro", "Image", "Outro". 
        // We'll treat standard images as 'IMAGE'.
        return 'IMAGE';
    };

    return (
        <div className="w-full px-6 py-4 bg-white border-t border-gray-100">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Film size={12} /> Visual Sequence
            </h4>

            <div className="relative h-14 w-full bg-gray-100 rounded-xl overflow-hidden flex gap-0.5 cursor-pointer shadow-inner">
                {segments.map((seg, i) => {
                    const widthPct = (seg.duration / totalDur) * 100;
                    const type = getSegmentType(seg, i);
                    const isActive = currentTime >= seg.start && currentTime < seg.end;

                    // Colors
                    let baseClass = "bg-blue-500 hover:bg-blue-400";
                    if (type === 'INTRO') baseClass = "bg-slate-400 hover:bg-slate-300";
                    if (i === segments.length - 1) baseClass = "bg-indigo-500 hover:bg-indigo-400"; // Slight variation for transition to outro

                    if (isActive) baseClass += " ring-2 ring-yellow-400 z-10 brightness-110";

                    return (
                        <div
                            key={i}
                            className={`relative group h-full flex items-center justify-center transition-all ${baseClass}`}
                            style={{ width: `${widthPct}%` }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSeek(seg.start);
                                onSegmentSelect(seg);
                            }}
                        >
                            {/* Segment Content */}
                            <div className="overflow-hidden opacity-30 group-hover:opacity-100 w-full h-full absolute inset-0 transition-opacity">
                                <img src={`${API_URL}/media/${timeline.project_id.replace('timeline.json', '')}/input/${seg.image}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="" />
                            </div>

                            {/* Label */}
                            <div className="z-10 text-[9px] font-bold text-white uppercase drop-shadow-md truncate px-1">
                                {type === 'INTRO' ? 'INTRO' : `#${i + 1}`}
                            </div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col gap-1">
                                <div className="font-bold flex justify-between">
                                    <span>{type === 'INTRO' ? 'Introduction' : `Segment ${i + 1}`}</span>
                                    <span className="text-gray-400">{seg.duration.toFixed(1)}s</span>
                                </div>
                                <div className="text-gray-400 truncate">{seg.image}</div>
                                <div className="flex gap-2 mt-1">
                                    <span className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 capitalize">{seg.effect.replace('_', ' ')}</span>
                                </div>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                    );
                })}

                {/* Playhead Marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20 pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.8)] transition-all duration-75"
                    style={{ left: `${(currentTime / totalDur) * 100}%` }}
                />
            </div>

            {/* Metadata Footer */}
            <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400 uppercase">
                <span>00:00</span>
                <span>{totalDur.toFixed(2)}s</span>
            </div>
        </div>
    );
}

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
                if (Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
                    audioRef.current.currentTime = currentTime;
                }
                audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]); // Removed currentTime dep to strictly control via play/pause or heavy seek

    // Main Loop
    useEffect(() => {
        let frameId;
        const render = () => {
            // Only increment time if playing
            if (isPlaying) {
                setCurrentTime(prev => {
                    const next = prev + 1 / 60; // 60 FPS
                    const maxDur = timeline.total_audio_duration || timeline.total_duration || 0;
                    if (next >= maxDur) {
                        setIsPlaying(false);
                        return 0; // Loop or stop
                    }
                    return next;
                });
            }

            drawFrame();
            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, timeline, currentTime]); // Re-added currentTime for drawFrame access? No, better to pull from state ref or just rely on react 18 batching. 
    // Actually, sticking to simple dependency pattern:

    const drawFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (!timeline || !timeline.segments || timeline.segments.length === 0) return;

        // Identify Segment
        const seg = timeline.segments.find(s => currentTime >= s.start && currentTime < s.end) || timeline.segments[timeline.segments.length - 1]; // Fallback to last

        // Update Current Segment State for UI
        if (seg && seg !== currentSegment) setCurrentSegment(seg);

        if (!seg) return;

        const img = imagesRef.current[seg.image];

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!img || !img.complete) {
            ctx.fillStyle = '#333';
            ctx.font = '12px Inter';
            ctx.fillText(`Loading Asset...`, 20, 20);
            return;
        }

        // Effect Calculation
        const segElapsed = Math.max(0, currentTime - seg.start);
        const progress = Math.min(1, segElapsed / seg.duration);

        ctx.save();

        let scale = 1.0;
        let tx = 0, ty = 0;

        // Apply Motion Presets (Simple preview)
        if (seg.effect === 'zoom_in') scale = 1.0 + (progress * 0.15);
        if (seg.effect === 'zoom_out') scale = 1.15 - (progress * 0.15);
        if (seg.effect === 'pan_left') tx = (progress - 0.5) * -40; // visual shift
        if (seg.effect === 'pan_right') tx = (progress - 0.5) * 40;

        // Center and draw with "Cover" fit
        // Calculate aspect ratios
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = img.width / img.height;

        let rw = canvas.width;
        let rh = canvas.height;

        if (imgAspect > canvasAspect) {
            // Image is wider than canvas (landscape vs portrait/square) - crop sides
            rh = canvas.height;
            rw = rh * imgAspect;
        } else {
            // Image is taller - crop top/bottom
            rw = canvas.width;
            rh = rw / imgAspect;
        }

        // Apply Scale
        let dw = rw * scale;
        let dh = rh * scale;

        // Center
        let dx = (canvas.width - dw) / 2 + tx;
        let dy = (canvas.height - dh) / 2 + ty;

        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();

        // Cinema bars overlay if needed (optional style choice)
    };

    const handleSeek = (time) => {
        setCurrentTime(time);
        if (audioRef.current) audioRef.current.currentTime = time;
    };

    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200 mb-8">
            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4">
                {/* Visual Preview (Canvas) */}
                <div className="lg:col-span-3 bg-black flex flex-col items-center justify-center relative group min-h-[400px]">
                    {/* Cinema Canvas */}
                    <canvas
                        ref={canvasRef}
                        width={640} // Default 16:9 for preview, though output might be 9:16. 
                        height={360}
                        className="w-full h-full max-h-[500px] object-contain shadow-2xl"
                    />

                    {/* Audio Engine */}
                    <audio
                        ref={audioRef}
                        src={`${API_URL}/media/${projectId}/audio/voice.mp3?t=${new Date(projectData.last_updated).getTime()}`}
                    />

                    {/* Floating Controls */}
                    <div className="absolute bottom-8 flex items-center gap-6 bg-gray-900/90 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                        <button onClick={() => handleSeek(0)} className="text-gray-400 hover:text-white transition"><SkipBack size={24} /></button>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition shadow-lg shadow-white/20"
                        >
                            {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="ml-1 fill-current" />}
                        </button>
                    </div>
                </div>

                {/* Metadata Panel (Inspector) */}
                <div className="lg:col-span-1 bg-gray-50 p-6 border-l border-gray-100 flex flex-col">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Maximize2 size={14} /> Inspector
                    </h3>

                    {currentSegment ? (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Segment Card */}
                            <div>
                                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-3">Active Segment</label>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <img src={`${API_URL}/media/${projectId}/input/${currentSegment.image}`} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-gray-800 truncate" title={currentSegment.image}>{currentSegment.image}</div>
                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                {currentSegment ? currentSegment.start.toFixed(1) : 0}s - {currentSegment ? currentSegment.end.toFixed(1) : 0}s
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-blue-50 p-2 rounded-lg">
                                            <div className="text-[9px] text-blue-400 uppercase font-bold text-center">Motion</div>
                                            <div className="text-xs font-bold text-blue-700 text-center capitalize">{currentSegment.effect.replace('_', ' ')}</div>
                                        </div>
                                        <div className="bg-purple-50 p-2 rounded-lg">
                                            <div className="text-[9px] text-purple-400 uppercase font-bold text-center">Duration</div>
                                            <div className="text-xs font-bold text-purple-700 text-center">{currentSegment.duration.toFixed(1)}s</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Audio State */}
                            <div>
                                <label className="text-[10px] text-gray-400 font-bold uppercase block mb-3">Audio State</label>
                                <div className="space-y-2">
                                    <div className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${currentTime < timeline.silence_start_duration || currentTime > (timeline.total_audio_duration - timeline.silence_end_duration)
                                        ? 'bg-gray-100 border-gray-200 text-gray-400'
                                        : 'bg-green-50 border-green-200 text-green-700'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${currentTime < timeline.silence_start_duration || currentTime > (timeline.total_audio_duration - timeline.silence_end_duration)
                                            ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
                                            }`} />
                                        <span className="text-xs font-bold">Voiceover</span>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-pink-50 border-pink-200 text-pink-700 flex items-center gap-3 shadow-sm">
                                        <Music size={14} />
                                        <span className="text-xs font-bold">Background Music</span>
                                        <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded ml-auto">AUTO-DUCK</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                            <div className="text-center">
                                <Maximize2 size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-medium">Select a segment to inspect</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* NEW Visual Timeline Bar */}
            <TimelineVisualBar
                timeline={timeline}
                currentTime={currentTime}
                onSeek={handleSeek}
                onSegmentSelect={setCurrentSegment}
            />
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Edit size={14} /> Segments Editor
                </h3>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
                    >
                        {saving ? <RotateCcw size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 bg-white p-2">
                <table className="w-full text-left border-collapse">
                    <thead className="text-[10px] text-gray-400 uppercase font-bold sticky top-0 z-10 bg-white">
                        <tr>
                            <th className="px-4 py-3 w-10"></th>
                            <th className="px-2 py-3 w-12">#</th>
                            <th className="px-2 py-3">Image Asset</th>
                            <th className="px-2 py-3 w-32">Timing</th>
                            <th className="px-2 py-3 w-40">Visual Effect</th>
                            <th className="px-2 py-3 w-20 text-center">Order</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {segments.map((seg, idx) => (
                            <tr
                                key={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`group hover:bg-gray-50/80 transition-all cursor-move rounded-lg ${draggedIndex === idx ? 'opacity-40 bg-blue-50 ring-2 ring-blue-100' : ''}`}
                            >
                                <td className="px-4 py-3">
                                    <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing" />
                                </td>
                                <td className="px-2 py-3">
                                    <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">
                                        {idx + 1}
                                    </div>
                                </td>
                                <td className="px-2 py-3">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0 shadow-sm group-hover:shadow-md transition-all">
                                            <img
                                                src={`${API_URL}/media/${projectId}/input/${seg.image}`}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]" title={seg.image}>
                                            {seg.image}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-mono font-bold text-gray-800">
                                            {(seg.start || 0).toFixed(1)}s <span className="text-gray-300 mx-1">→</span> {(seg.end || 0).toFixed(1)}s
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                                            {(seg.duration || 0).toFixed(2)}s duration
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2 py-3">
                                    <select
                                        value={seg.effect}
                                        onChange={(e) => updateEffect(idx, e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 cursor-pointer text-gray-700 shadow-sm transition-all appearance-none"
                                    >
                                        {effectOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.icon} {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-2 py-3 text-center">
                                    <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveSegment(idx, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 disabled:opacity-0 transition-all"><ChevronUp size={14} /></button>
                                        <button onClick={() => moveSegment(idx, 'down')} disabled={idx === segments.length - 1} className="p-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 disabled:opacity-0 transition-all"><ChevronDown size={14} /></button>
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
    const [dependencyError, setDependencyError] = useState(null); // 'voice' | 'images' | null

    const fetchTimeline = async () => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/timeline`);
            if (res.ok) {
                const data = await res.json();
                setTimeline(data);
                setDependencyError(null);
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
        setDependencyError(null);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/timeline/generate`, { method: 'POST' });
            if (res.ok) {
                await fetchTimeline();
                onUpdate();
            } else {
                const err = await res.json();
                // err.detail could be a string OR an object now
                const detail = err.detail || "";
                const msg = typeof detail === 'string' ? detail : (detail.error || JSON.stringify(detail));

                if (msg.includes("voice") || msg.includes("audio")) {
                    setDependencyError('voice');
                } else if (msg.includes("image")) {
                    setDependencyError('images');
                } else {
                    alert(msg || "Failed to generate timeline");
                }
            }
        } catch (err) {
            alert("Error generating timeline");
        } finally {
            setGenerating(false);
        }
    };

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (loading) return <div className="p-20 text-center text-gray-400 text-sm">Loading timeline studio...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Film size={24} />
                        </div>
                        Timeline Director
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-11">Visualize and fine-tune segment timing and effects.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-6 h-12 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-black disabled:opacity-50 transition shadow-lg active:scale-95"
                    >
                        {generating ? <RotateCcw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {timeline ? 'REGENERATE TIMELINE' : 'GENERATE TIMELINE'}
                    </button>
                </div>
            </div>

            {dependencyError && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-top-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-full mb-3">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Prerequisites Missing</h3>
                    <p className="text-sm text-gray-600 mb-6 max-w-lg">
                        {dependencyError === 'voice'
                            ? "We couldn't find a generated voiceover. The timeline requires audio duration to calculate segment timing."
                            : "No images found in the project input folder."}
                    </p>
                    <button
                        onClick={() => scrollTo(dependencyError === 'voice' ? 'section-voice' : 'section-images')}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs uppercase tracking-wide shadow-md transition-all"
                    >
                        Go to {dependencyError === 'voice' ? 'Voice Studio' : 'Image Upload'}
                    </button>
                </div>
            )}

            {timeline && (
                <TimelinePreview
                    projectId={projectId}
                    timeline={timeline}
                    projectData={projectData}
                />
            )}

            {!timeline && !dependencyError && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-24 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="p-6 bg-white rounded-full shadow-sm mb-6 text-purple-200">
                        <Film size={64} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">No Timeline Generated</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                        The timeline synchronizes your images with the voiceover. Generate the initial timeline to start editing.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 hover:-translate-y-0.5 transition-all uppercase text-xs tracking-wider"
                    >
                        Generate Initial Timeline
                    </button>
                </div>
            )}

            {timeline && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Summary Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Sliders size={14} /> Timeline Stats
                            </h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Total Duration</span>
                                    <span className="text-xl font-bold text-purple-600 font-mono tracking-tight">{(timeline.total_duration || 0).toFixed(2)}s</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Image Segments</span>
                                    <span className="text-xl font-bold text-gray-900 font-mono tracking-tight">{timeline.segments?.length || 0}</span>
                                </div>

                                <div className="pt-2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                        <Music size={14} /> Audio Layers
                                    </h4>
                                    <div className="bg-gray-50/80 p-4 rounded-xl space-y-3 border border-gray-100">
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-gray-500 font-bold">Background Music</span>
                                            <span className="font-mono font-bold text-gray-800 truncate max-w-[120px]" title={timeline.audio?.bgm?.file}>{timeline.audio?.bgm?.file || 'None'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-gray-500 font-bold">Volume</span>
                                            <div className="h-2 w-20 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(timeline.audio?.bgm?.volume || 0) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs items-center">
                                            <span className="text-gray-500 font-bold">Auto-Ducking</span>
                                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${timeline.audio?.bgm?.ducking ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
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

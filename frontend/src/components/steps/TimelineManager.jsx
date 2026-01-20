import React, { useState, useEffect, useRef } from 'react';
import {
    Film, RefreshCw, RotateCcw, Sliders, Music, Edit, Save,
    GripVertical, ChevronUp, ChevronDown, AlertCircle, Maximize2,
    SkipBack, Pause, Play, Square, CheckCircle, Crop
} from 'lucide-react';
import { API_URL } from '../../config';
import TimelinePreview from '../TimelinePreview';

// --- Sub-components (Internal) ---

// (Internal Legacy Components Removed in favor of External TimelinePreview)

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

    const kbPresets = [
        { value: 'subtle', label: 'Subtle Move' },
        { value: 'zoom_in', label: 'Deep Zoom In' },
        { value: 'zoom_out', label: 'Pull Out' },
        { value: 'pan_left_right', label: 'Pan L → R' },
        { value: 'pan_bottom_top', label: 'Pan B → T' }
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

    const updateKB = (index, field, value) => {
        const newSegments = [...segments];
        if (!newSegments[index].ken_burns) {
            newSegments[index].ken_burns = { enabled: true, preset: 'subtle' };
        }
        newSegments[index].ken_burns[field] = value;
        setSegments(newSegments);
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Respect intro/outro silence from current timeline
            const silenceStart = timeline.silence_start_duration || 0;
            const totalAudio = timeline.total_audio_duration || 0;

            let currentCursor = 0.0;
            const updatedSegments = segments.map((seg, idx) => {
                const duration = seg.duration || 0;
                const start = currentCursor;
                const end = currentCursor + duration;

                const newSeg = {
                    ...seg,
                    start: parseFloat(start.toFixed(3)),
                    end: parseFloat(end.toFixed(3)),
                    duration: parseFloat(duration.toFixed(3))
                };

                currentCursor += duration;
                return newSeg;
            });

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
            console.error("Save failed", err);
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
                            <th className="px-2 py-3 w-12 text-center">#</th>
                            <th className="px-2 py-3">Asset</th>
                            <th className="px-2 py-3 w-28">Timing</th>
                            <th className="px-2 py-3 w-40">Ken Burns Motion</th>
                            <th className="px-2 py-3 w-16 text-center">Order</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {segments.map((seg, idx) => {
                            const kb = seg.ken_burns || { enabled: false, preset: 'subtle' };
                            const isVideo = seg.image.lower?.endsWith('.mp4') || seg.image.lower?.endsWith('.webm') || seg.image.includes('.mp4'); // Simple Check

                            return (
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
                                    <td className="px-2 py-3 text-center">
                                        <div className="w-6 h-6 mx-auto rounded-lg bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-2 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0 shadow-sm transition-all">
                                                <img
                                                    src={`${API_URL}/media/${projectId}/${seg.image.startsWith('../') ? seg.image.substring(3) : 'input/' + seg.image}`}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]" title={seg.image}>
                                                    {seg.image.split('/').pop()}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono font-bold text-gray-900 leading-none">
                                                {(seg.start || 0).toFixed(1)}s
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium mt-1">
                                                ∆ {(seg.duration || 0).toFixed(1)}s
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateKB(idx, 'enabled', !kb.enabled)}
                                                disabled={isVideo}
                                                className={`p-2 rounded-lg transition-all ${kb.enabled ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                title={kb.enabled ? "Ken Burns Active" : "Ken Burns Disabled"}
                                            >
                                                <Sliders size={14} className={kb.enabled ? "animate-pulse" : ""} />
                                            </button>

                                            {kb.enabled && (
                                                <select
                                                    value={kb.preset}
                                                    onChange={(e) => updateKB(idx, 'preset', e.target.value)}
                                                    className="flex-1 px-2 py-1.5 text-[11px] font-bold border border-gray-200 rounded-lg bg-white hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-gray-700 shadow-sm transition-all"
                                                >
                                                    {kbPresets.map(p => (
                                                        <option key={p.value} value={p.value}>{p.label}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {!kb.enabled && (
                                                <span className="text-[10px] text-gray-400 font-bold uppercase truncate">Static</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                        <div className="flex flex-col gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => moveSegment(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-indigo-50 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-0 transition-all"><ChevronUp size={14} /></button>
                                            <button onClick={() => moveSegment(idx, 'down')} disabled={idx === segments.length - 1} className="p-1 hover:bg-indigo-50 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-0 transition-all"><ChevronDown size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
// --- Main Component ---

export default function TimelineManager({ projectId, lastUpdated, projectData, onUpdate, onEditAsset }) {
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
                        {timeline ? 'Regenerate New Timeline' : 'Generate New Timeline'}
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
                    refreshTs={new Date(projectData.last_updated).getTime()}
                    onEditAsset={onEditAsset}
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

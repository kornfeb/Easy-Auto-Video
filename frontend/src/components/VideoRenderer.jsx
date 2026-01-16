import React, { useState, useEffect } from 'react';
import { Film, Download, Video, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

export default function VideoRenderer({ projectId, lastUpdated, projectData, onUpdate }) {
    const [rendering, setRendering] = useState(false);
    const [videoFormat, setVideoFormat] = useState('portrait');
    const [transitionId, setTransitionId] = useState('none');
    const [transitionDur, setTransitionDur] = useState(0.5);

    // Use timestamp to force refresh video buffer
    const cacheBust = projectData.last_updated ? new Date(projectData.last_updated).getTime() : Date.now();
    const finalUrl = `${API_URL}/media/${projectId}/output/final_video.mp4?t=${cacheBust}`;

    const TRANSITIONS = [
        { id: 'none', name: 'None (Hard Cut)' },
        { id: 'fade', name: 'Cross Dissolve' },
        { id: 'slideleft', name: 'Slide Left' },
        { id: 'slideright', name: 'Slide Right' },
        { id: 'circleopen', name: 'Circle Open' },
        { id: 'wipedown', name: 'Wipe Down' }
    ];

    const handleRender = async () => {
        setRendering(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_format: videoFormat,
                    transition_id: transitionId,
                    transition_duration: parseFloat(transitionDur)
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Render failed');
            }
            onUpdate();
            alert("Render Complete! Video is ready.");
        } catch (e) {
            alert(e.message);
        } finally {
            setRendering(false);
        }
    };

    return (
        <div className="mt-8 pt-8 border-t border-gray-100 mb-20">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Film size={24} className="text-gray-500" /> Final Production
                </h2>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Video size={120} />
                </div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Ready to Render?</h3>
                        <p className="text-gray-400 mb-6 font-light">
                            Select format and transitions to combine your script, voiceover, music, and images.
                        </p>

                        {/* Format Selector */}
                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setVideoFormat('portrait')}
                                className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-3 border transition-all ${videoFormat === 'portrait' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                            >
                                <div className="w-3 h-5 border-2 border-current rounded-sm"></div>
                                <div className="text-left leading-tight">
                                    <div className="font-bold text-sm">TikTok / Reels</div>
                                    <div className="text-[10px] opacity-70">9:16 (1080x1920)</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setVideoFormat('landscape')}
                                className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-3 border transition-all ${videoFormat === 'landscape' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                            >
                                <div className="w-5 h-3 border-2 border-current rounded-sm"></div>
                                <div className="text-left leading-tight">
                                    <div className="font-bold text-sm">YouTube</div>
                                    <div className="text-[10px] opacity-70">16:9 (1920x1080)</div>
                                </div>
                            </button>
                        </div>

                        {/* Transition Selector */}
                        <div className="mb-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Transition Effect</label>
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={transitionId}
                                    onChange={(e) => setTransitionId(e.target.value)}
                                    className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                >
                                    {TRANSITIONS.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 whitespace-nowrap">Duration (s)</span>
                                    <input
                                        type="number"
                                        min="0.1" max="2.0" step="0.1"
                                        value={transitionDur}
                                        onChange={(e) => setTransitionDur(e.target.value)}
                                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg block w-full p-2.5"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleRender}
                            disabled={rendering}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg shadow-lg shadow-green-900/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                        >
                            {rendering ? (
                                <><Loader2 className="animate-spin" /> RENDERING VIDEO...</>
                            ) : (
                                <><Video /> START RENDER ({videoFormat === 'portrait' ? 'Vertical' : 'Horizontal'})</>
                            )}
                        </button>
                        {rendering && (
                            <p className="text-center text-xs text-blue-300 animate-pulse">
                                Processing transitions... Applying effects... Encoding...
                                <br />(This may take longer with transitions)
                            </p>
                        )}

                        {!rendering && (
                            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg text-xs text-gray-500 border border-gray-700">
                                <strong>Selected Specs:</strong> {videoFormat === 'portrait' ? '1080x1920' : '1920x1080'} • 30fps • {TRANSITIONS.find(t => t.id === transitionId)?.name}
                            </div>
                        )}
                    </div>

                    <div className={`bg-black/50 rounded-xl border border-gray-700 flex items-center justify-center relative overflow-hidden mx-auto transition-all ${videoFormat === 'portrait' ? 'aspect-[9/16] max-h-[500px]' : 'aspect-video w-full'}`}>
                        <video
                            controls
                            className="w-full h-full object-contain"
                            key={finalUrl} // Force re-render on update
                        >
                            <source src={finalUrl} type="video/mp4" />
                            <div className="text-center p-4 text-gray-500">
                                <p>No video generated yet.</p>
                            </div>
                        </video>
                    </div>
                </div>

                <div className="flex justify-end mt-6 gap-4 border-t border-gray-800 pt-4">
                    <a
                        href={`${API_URL}/projects/${projectId}/download/video`}
                        download // Just in case, but server header handles it
                        className={`text-sm font-bold flex items-center gap-2 transition-colors px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white`}
                    >
                        <Download size={16} /> Download MP4
                    </a>
                </div>
            </div>
        </div>
    );
}

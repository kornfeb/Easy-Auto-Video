import React, { useState } from 'react';
import { Film, Download, Video, Loader2, Play } from 'lucide-react';
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
        } catch (e) {
            alert(e.message);
        } finally {
            setRendering(false);
        }
    };

    return (
        <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 text-white overflow-hidden relative">
            {/* Background Texture */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Film size={200} />
            </div>

            {/* Header */}
            <div className="p-8 border-b border-gray-800 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                        <Video size={28} className="text-blue-500" /> Final Production
                    </h2>
                    <p className="text-gray-400 mt-1 max-w-xl text-sm">
                        Combine all your assets into a high-quality video file. Choose your target platform format.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-gray-800 rounded text-xs font-mono text-gray-500 border border-gray-700">
                        {videoFormat === 'portrait' ? '9:16' : '16:9'}
                    </div>
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                {/* Controls (Left) */}
                <div className="lg:col-span-5 space-y-8">

                    {/* Format Section */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Target Platform</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setVideoFormat('portrait')}
                                className={`py-4 px-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all ${videoFormat === 'portrait'
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40 transform scale-[1.02]'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                            >
                                <div className="w-6 h-10 border-2 border-current rounded mb-1"></div>
                                <div className="font-bold text-sm">TikTok / Reels</div>
                            </button>

                            <button
                                onClick={() => setVideoFormat('landscape')}
                                className={`py-4 px-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all ${videoFormat === 'landscape'
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40 transform scale-[1.02]'
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                            >
                                <div className="w-10 h-6 border-2 border-current rounded mb-1"></div>
                                <div className="font-bold text-sm">YouTube / TV</div>
                            </button>
                        </div>
                    </div>

                    {/* Transitions Section */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Style & Effects</label>
                        <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700 space-y-4">
                            <div>
                                <div className="text-xs text-gray-400 mb-1.5">Transition Type</div>
                                <select
                                    value={transitionId}
                                    onChange={(e) => setTransitionId(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3"
                                >
                                    {TRANSITIONS.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                                    <span>Duration</span>
                                    <span>{transitionDur}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1" max="2.0" step="0.1"
                                    value={transitionDur}
                                    onChange={(e) => setTransitionDur(e.target.value)}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleRender}
                        disabled={rendering}
                        className="w-full py-5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-xl font-bold text-lg shadow-lg shadow-green-900/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {rendering ? (
                            <><Loader2 className="animate-spin" /> RENDERING...</>
                        ) : (
                            <><Play className="group-hover:scale-110 transition-transform fill-current" /> RENDER VIDEO</>
                        )}
                    </button>
                    {rendering && (
                        <p className="text-center text-xs text-gray-500 font-mono animate-pulse">
                            Job queued. Please wait...
                        </p>
                    )}
                </div>

                {/* Preview (Right) */}
                <div className="lg:col-span-7 flex flex-col">
                    <div className={`flex-1 bg-black rounded-xl border border-gray-700 flex items-center justify-center relative overflow-hidden shadow-2xl transition-all ${videoFormat === 'portrait' ? 'aspect-[9/16] max-h-[600px] mx-auto' : 'aspect-video w-full'}`}>
                        <video
                            controls
                            className="w-full h-full object-contain"
                            key={finalUrl} // Force re-render on update
                        >
                            <source src={finalUrl} type="video/mp4" />
                            <div className="text-center p-8 text-gray-600">
                                <Film size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Render output will appear here.</p>
                            </div>
                        </video>
                    </div>

                    <div className="mt-6 flex justify-between items-center bg-gray-800/80 p-4 rounded-xl border border-gray-700/50">
                        <div className="text-xs text-gray-400">
                            Looking good? Download the file.
                        </div>
                        <a
                            href={`${API_URL}/projects/${projectId}/download/video`}
                            download
                            className="text-sm font-bold flex items-center gap-2 transition-colors px-6 py-2 rounded-lg bg-white text-black hover:bg-gray-200"
                        >
                            <Download size={16} /> Download
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

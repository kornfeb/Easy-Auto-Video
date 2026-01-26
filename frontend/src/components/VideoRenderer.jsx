import React, { useState, useEffect } from 'react';
import { Film, Download, Video, Loader2, Play, FileVideo } from 'lucide-react';
import { API_URL } from '../config';

export default function VideoRenderer({ projectId, lastUpdated, projectData, onUpdate }) {
    const [rendering, setRendering] = useState(false);
    const [videoFormat, setVideoFormat] = useState('portrait');
    const [transitionId, setTransitionId] = useState('slideright');
    const [transitionDur, setTransitionDur] = useState(1.0);
    const [outputPath, setOutputPath] = useState(null);

    // Use timestamp to force refresh video buffer
    const cacheBust = projectData.last_updated ? new Date(projectData.last_updated).getTime() : Date.now();

    // Use the download endpoint with preview=true to stream the file from the standardized path
    const finalUrl = `${API_URL}/projects/${projectId}/download/video?preview=true&t=${cacheBust}`;

    const TRANSITIONS = [
        { id: 'none', name: 'None (Hard Cut)' },
        { id: 'fade', name: 'Cross Dissolve' },
        { id: 'slideleft', name: 'Slide Left' },
        { id: 'slideright', name: 'Slide Right' },
        { id: 'circleopen', name: 'Circle Open' },
        { id: 'wipedown', name: 'Wipe Down' }
    ];

    useEffect(() => {
        // Fetch the display path
        fetch(`${API_URL}/projects/${projectId}/output_path`)
            .then(res => res.json())
            .then(data => {
                if (data.exists) setOutputPath(data.path);
            })
            .catch(console.error);
    }, [projectId, lastUpdated, rendering]);

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
        <div className="max-w-6xl mx-auto space-y-8" data-section="video-preview">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                            <Video size={24} />
                        </div>
                        Final Production
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-11">Combine all your assets into a high-quality video file.</p>
                </div>
                <div className="px-3 py-1 bg-gray-100 rounded text-xs font-mono font-bold text-gray-500 border border-gray-200 uppercase">
                    {videoFormat === 'portrait' ? '9:16 Vertical' : '16:9 Landscape'}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                    {/* Controls (Left) */}
                    <div className="lg:col-span-5 p-8 border-r border-gray-100 bg-gray-50/30 flex flex-col justify-between">
                        <div className="space-y-8">
                            {/* Format Section */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block flex items-center gap-2">
                                    <Film size={14} /> Target Format
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setVideoFormat('portrait')}
                                        className={`py-5 px-4 rounded-xl flex flex-col items-center justify-center gap-3 border-2 transition-all group ${videoFormat === 'portrait'
                                            ? 'bg-white border-rose-500 text-rose-600 shadow-md ring-1 ring-rose-100'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-8 h-12 border-2 rounded-md transition-colors ${videoFormat === 'portrait' ? 'border-rose-500 bg-rose-50' : 'border-current'}`}></div>
                                        <div className="font-bold text-xs uppercase tracking-wide">TikTok / Reels</div>
                                    </button>

                                    <button
                                        onClick={() => setVideoFormat('landscape')}
                                        className={`py-5 px-4 rounded-xl flex flex-col items-center justify-center gap-3 border-2 transition-all group ${videoFormat === 'landscape'
                                            ? 'bg-white border-rose-500 text-rose-600 shadow-md ring-1 ring-rose-100'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-12 h-8 border-2 rounded-md transition-colors ${videoFormat === 'landscape' ? 'border-rose-500 bg-rose-50' : 'border-current'}`}></div>
                                        <div className="font-bold text-xs uppercase tracking-wide">YouTube / TV</div>
                                    </button>
                                </div>
                            </div>

                            {/* Transitions Section */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block flex items-center gap-2">
                                    <Play size={14} /> Transitions & Effects
                                </label>
                                <div className="space-y-5">
                                    <div>
                                        <div className="text-xs font-bold text-gray-700 mb-2">Transition Type</div>
                                        <div className="relative">
                                            <select
                                                value={transitionId}
                                                onChange={(e) => setTransitionId(e.target.value)}
                                                className="w-full h-10 pl-3 pr-8 bg-gray-50 border border-gray-200 text-gray-900 text-sm font-medium rounded-lg focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none transition appearance-none cursor-pointer hover:border-gray-300"
                                            >
                                                {TRANSITIONS.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                                            <span>Duration</span>
                                            <span className="text-rose-600 font-mono">{transitionDur}s</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1" max="2.0" step="0.1"
                                            value={transitionDur}
                                            onChange={(e) => setTransitionDur(e.target.value)}
                                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-8">
                            <button
                                onClick={handleRender}
                                disabled={rendering}
                                className="w-full h-16 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm uppercase tracking-wider shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {rendering ? (
                                    <><Loader2 className="animate-spin" size={20} /> PROCESSING VIDEO...</>
                                ) : (
                                    <><Play className="fill-current" size={20} /> RENDER FINAL VIDEO</>
                                )}
                            </button>
                            {rendering && (
                                <p className="text-center text-xs text-gray-400 font-medium mt-3 animate-pulse">
                                    This may take a minute. Please do not close this tab.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Preview (Right) */}
                    <div className="lg:col-span-7 bg-gray-100 p-8 flex flex-col items-center justify-center min-h-[500px]">
                        <div className={`relative bg-black rounded-2xl shadow-2xl border-4 border-white ring-1 ring-gray-200 overflow-hidden flex items-center justify-center transition-all duration-500 ${videoFormat === 'portrait' ? 'aspect-[9/16] h-[550px]' : 'aspect-video w-full'}`}>
                            <video
                                controls
                                className="w-full h-full object-contain"
                                key={finalUrl} // Force re-render on update
                            >
                                <source src={finalUrl} type="video/mp4" />
                                <div className="text-center p-8 text-white/50">
                                    <Film size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Render output will appear here.</p>
                                </div>
                            </video>
                        </div>

                        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-md">
                            <a
                                href={`${API_URL}/projects/${projectId}/download/video`}
                                download
                                className="w-full h-12 bg-white text-gray-900 border border-gray-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
                            >
                                <Download size={18} /> Download MP4
                            </a>

                            {outputPath && (
                                <div className="text-xs text-gray-400 font-mono text-center flex items-center gap-2 opacity-75">
                                    <FileVideo size={12} />
                                    <span className="truncate max-w-[300px]" title={outputPath}>
                                        {outputPath.split('/').slice(-3).join('/')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

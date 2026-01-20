import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader, AlertCircle, CheckCircle, X, RotateCcw, Download, Video } from 'lucide-react';
import { API_URL } from '../config';

export default function PipelineOrchestrator({ projectId, projectStatus, onUpdate }) {
    const [job, setJob] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const pollInterval = useRef(null);

    // Initial Status Check
    useEffect(() => {
        checkStatus();
        return () => stopPolling();
    }, [projectId]);

    const stopPolling = () => {
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }
        setIsPolling(false);
    };

    const startPolling = () => {
        if (pollInterval.current) return;
        setIsPolling(true);
        pollInterval.current = setInterval(checkStatus, 2000);
    };

    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/pipeline/status`);
            if (res.ok) {
                const data = await res.json();

                // If we get a valid job object
                if (data.status && data.status !== 'idle') {
                    setJob(data);

                    if (data.status === 'running') {
                        startPolling();
                    } else {
                        // Job finished (completed or failed)
                        stopPolling();
                        if (data.status === 'completed' && job?.status === 'running') {
                            // Just finished - refresh and scroll to video
                            onUpdate();

                            // Wait for DOM update then scroll to video section
                            setTimeout(() => {
                                const videoSection = document.querySelector('[data-section="video-preview"]');
                                if (videoSection) {
                                    videoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }, 500);
                        }
                    }
                } else {
                    setJob(null);
                    stopPolling();
                }
            }
        } catch (e) {
            console.error("Status check failed", e);
            stopPolling();
        }
    };

    const handleStart = async () => {
        try {
            // Optimistic UI
            setJob({ status: 'running', progress: 0, current_step_label: 'Initializing...' });
            startPolling();

            const res = await fetch(`${API_URL}/projects/${projectId}/pipeline/start`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                setJob({ status: 'failed', error: err.detail || "Failed to start pipeline" });
                stopPolling();
            } else {
                checkStatus(); // Get immediate valid state
            }
        } catch (e) {
            setJob({ status: 'failed', error: "Network request failed" });
            stopPolling();
        }
    };

    const handleDismiss = async () => {
        // Technically we can't "clear" the server memory easily without an endpoint, 
        // but for UI we just reset local state. 
        // If we want to be correct, the server should cycle back to idle eventually or we ignore it.
        // Actually, the server returns the last job state. 
        // We might want a 'reset' endpoint? Or just ignore it if it's completed/failed.
        setJob(null);
    };

    // --- Render States ---

    // 1. Idle (Show Button)
    if (!job || (job.status !== 'running' && job.status !== 'failed' && job.status !== 'completed')) {
        return (
            <button
                onClick={handleStart}
                className="group relative flex items-center gap-3 pl-4 pr-6 py-2 bg-gray-900 text-white rounded-full hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Play size={14} className="fill-current ml-0.5" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-xs font-bold uppercase tracking-wider">Generate Video</span>
                        <span className="text-[9px] text-gray-400 group-hover:text-white/80 font-medium mt-0.5">One-Click Auto Run</span>
                    </div>
                </div>
            </button>
        );
    }

    // 2. Running
    if (job.status === 'running') {
        return (
            <div className="flex items-center gap-4 bg-white border border-blue-100 pr-2 pl-4 py-1.5 rounded-full shadow-lg shadow-blue-500/5 min-w-[300px]">
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider animate-pulse">Running Pipeline...</span>
                        <span className="text-[10px] font-mono font-bold text-gray-400">{job.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                            style={{ width: `${job.progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_1s_infinite] skew-x-12"></div>
                        </div>
                    </div>
                    <div className="mt-1 flex justify-between">
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[180px]">{job.current_step_label || 'Processing...'}</span>
                    </div>
                </div>
                {/* Spinner */}
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center flex-none">
                    <Loader size={16} className="animate-spin" />
                </div>
            </div>
        );
    }

    // 3. Failed
    if (job.status === 'failed') {
        return (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 pl-4 pr-2 py-2 rounded-full shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-none">
                    <AlertCircle size={18} />
                </div>
                <div className="flex flex-col mr-2">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Generation Failed</span>
                    <span className="text-xs font-bold text-gray-800 max-w-[200px] truncate" title={job.error}>
                        {job.error || 'Unknown Error'}
                    </span>
                </div>
                <div className="h-8 w-px bg-red-200 mx-1"></div>
                <button
                    onClick={handleStart}
                    className="p-2 hover:bg-white rounded-full text-red-600 transition hover:shadow-sm"
                    title="Retry"
                >
                    <RotateCcw size={16} />
                </button>
                <button
                    onClick={handleDismiss}
                    className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition"
                    title="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    // 4. Completed
    if (job.status === 'completed') {
        const scrollToVideo = () => {
            const videoSection = document.querySelector('[data-section="video-preview"]');
            if (videoSection) {
                videoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        return (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 pl-4 pr-2 py-2 rounded-full shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-none">
                    <CheckCircle size={18} />
                </div>
                <div className="flex flex-col mr-2">
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Complete</span>
                    <span className="text-xs font-bold text-gray-800">Video Generated</span>
                </div>

                <div className="flex items-center gap-1 border-l border-green-200 pl-3 ml-1">
                    <button
                        onClick={scrollToVideo}
                        className="p-1.5 hover:bg-green-100 rounded-lg text-green-700 transition flex items-center gap-1.5"
                        title="View Video"
                    >
                        <Video size={14} />
                        <span className="text-xs font-bold">View</span>
                    </button>
                    <a
                        href={`${API_URL}/projects/${projectId}/download/video`}
                        download
                        className="p-1.5 hover:bg-green-100 rounded-lg text-green-700 transition flex items-center gap-1.5"
                        title="Download MP4"
                    >
                        <Download size={14} />
                        <span className="text-xs font-bold">Download</span>
                    </a>
                </div>

                <div className="w-px h-6 bg-green-200 mx-1"></div>

                <button
                    onClick={handleDismiss}
                    className="p-2 hover:bg-white rounded-full text-green-600 transition hover:shadow-sm"
                    title="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return null;
}

import React, { useState, useEffect } from 'react';
import {
    Clock, Play, ShieldCheck, FileText, FileAudio, Image as ImageIcon,
    FileVideo, Activity, AlertCircle, RotateCcw, Sparkles, Mic, Volume2, Film
} from 'lucide-react';
import { API_URL } from '../../config';

export default function PipelineControl({ project, onUpdate }) {
    const [dynamicSteps, setDynamicSteps] = useState([]);
    const [isRunningAuto, setIsRunningAuto] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/pipeline/steps`)
            .then(res => res.json())
            .then(data => setDynamicSteps(data))
            .catch(err => console.error("Failed to fetch steps", err));
    }, []);

    const statuses = project.pipeline || {};
    const disabledSteps = project.config?.disabled_steps || [];

    const handleToggleStep = async (stepId, currentDisabled) => {
        const newDisabled = currentDisabled
            ? disabledSteps.filter(id => id !== stepId)
            : [...disabledSteps, stepId];

        try {
            const res = await fetch(`${API_URL}/projects/${project.project_id}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disabled_steps: newDisabled })
            });
            if (res.ok) onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRun = async (stepId) => {
        try {
            const res = await fetch(`${API_URL}/projects/${project.project_id}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step_name: stepId })
            });
            if (res.ok) onUpdate();
            else alert("Failed to run step");
        } catch (err) {
            alert("Error running step");
        }
    };

    const handleAutoRun = async () => {
        setIsRunningAuto(true);
        try {
            const res = await fetch(`${API_URL}/projects/${project.project_id}/run/auto`, {
                method: 'POST'
            });
            if (res.ok) onUpdate();
            else alert("Auto-run failed or stopped early");
        } catch (err) {
            alert("Error starting auto-run");
        } finally {
            setIsRunningAuto(false);
        }
    };

    const handleRetry = async (stepId) => {
        try {
            const resetRes = await fetch(`${API_URL}/projects/${project.project_id}/reset-step/${stepId}`, {
                method: 'POST'
            });
            if (resetRes.ok) {
                handleAutoRun(); // Or just let user click run
                onUpdate();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getIcon = (id) => {
        if (id.includes('cover')) return ImageIcon;
        if (id.includes('hook')) return Sparkles;
        if (id.includes('script')) return FileText;
        if (id.includes('tts')) return Mic;
        if (id.includes('audio_mix')) return Volume2;
        if (id.includes('timeline')) return Film;
        if (id.includes('dryrun')) return ShieldCheck;
        if (id.includes('render')) return FileVideo;
        return Activity;
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Activity size={28} className="text-blue-600" /> Pipeline Automation
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Configure and monitor the automated video production steps.</p>
                </div>
                <button
                    onClick={handleAutoRun}
                    disabled={isRunningAuto}
                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg hover:shadow-xl active:scale-95 ${isRunningAuto ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                >
                    {isRunningAuto ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-indigo-600"></div>
                            Running Auto Pilot...
                        </>
                    ) : (
                        <>
                            <Play size={20} /> RUN FULL AUTO
                        </>
                    )}
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden">
                {dynamicSteps.map(step => {
                    const stepData = statuses[step.id] || {};
                    const status = stepData.status || 'pending';
                    const isDisabled = disabledSteps.includes(step.id);
                    const icon = getIcon(step.id);
                    const error = stepData.error;

                    return (
                        <div key={step.id} className={`p-5 flex flex-col gap-3 transition-colors ${isDisabled ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50/20'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <input
                                        type="checkbox"
                                        checked={!isDisabled}
                                        disabled={isRunningAuto}
                                        onChange={() => handleToggleStep(step.id, isDisabled)}
                                        className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                        title={isDisabled ? "Enable step" : "Disable step"}
                                    />

                                    <div className={`p-3 rounded-xl ${status === 'completed' ? 'bg-green-100 text-green-600' :
                                        status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {React.createElement(icon, { size: 24 })}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 flex items-center gap-2 text-base">
                                            {step.label}
                                            {isDisabled && <span className="text-[9px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase">Disabled</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-2">
                                            <span className={`uppercase font-bold ${status === 'failed' ? 'text-red-500' : status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                                                {status}
                                            </span>
                                            {stepData.updated_at && <span className="text-gray-300">•</span>}
                                            {stepData.updated_at && <span>{new Date(stepData.updated_at).toLocaleTimeString()}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {!isDisabled && status === 'failed' && error?.recoverable && (
                                        <button
                                            onClick={() => handleRetry(step.id)}
                                            disabled={isRunningAuto}
                                            className="px-4 py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-100 transition flex items-center gap-1 border border-orange-200"
                                        >
                                            <RotateCcw size={14} /> Retry
                                        </button>
                                    )}
                                    {!isDisabled && (
                                        <button
                                            onClick={() => handleRun(step.id)}
                                            disabled={isRunningAuto}
                                            className={`px-5 py-2 text-xs font-bold rounded-lg transition border ${status === 'completed'
                                                ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                                } ${isRunningAuto ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {status === 'completed' ? 'Re-run' : 'Run Step'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!isDisabled && status === 'failed' && error && (
                                <div className="ml-16 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                    <div className="font-bold flex items-center gap-1 mb-1 text-red-800">
                                        <AlertCircle size={14} /> {error.code}: {error.message_th || error.message}
                                    </div>
                                    {error.message_th && error.message && (
                                        <div className="opacity-80 font-normal italic mb-2">{error.message}</div>
                                    )}
                                    {error.detail && <div className="font-mono bg-white/60 p-2 rounded border border-red-200/50 text-[10px] break-all">{error.detail}</div>}
                                    {!error.recoverable && (
                                        <div className="mt-2 text-[10px] font-black uppercase text-red-900 bg-red-200/50 px-2 py-0.5 rounded w-fit">
                                            Manual Fix Required
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

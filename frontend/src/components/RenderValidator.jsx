import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, AlertCircle, XCircle, RotateCcw, Play } from 'lucide-react';
import { API_URL } from '../config';

export default function RenderValidator({ projectId }) {
    const [report, setReport] = useState(null);
    const [checking, setChecking] = useState(false);

    const runCheck = async () => {
        setChecking(true);
        setReport(null);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/render/dry-run`, { method: 'POST' });
            const data = await res.json();
            setReport(data);
        } catch (err) {
            alert("Validation check failed");
        } finally {
            setChecking(false);
        }
    };

    const statusColors = {
        PASS: "bg-green-50 border-green-200 text-green-800",
        WARNING: "bg-yellow-50 border-yellow-200 text-yellow-800",
        FAIL: "bg-red-50 border-red-200 text-red-800"
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                            <ShieldCheck size={24} />
                        </div>
                        Dry Run Validation
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-11">Ensure all assets are ready before final rendering.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={runCheck}
                        disabled={checking}
                        className="flex items-center gap-2 px-6 h-12 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-black disabled:opacity-50 transition shadow-lg active:scale-95"
                    >
                        {checking ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
                        {checking ? 'Running Check...' : 'Run Diagnostics'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 min-h-[400px]">
                {!report && !checking && (
                    <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center h-full">
                        <div className="p-6 bg-gray-50 rounded-full mb-6 text-gray-300">
                            <ShieldCheck size={48} />
                        </div>
                        <p className="font-bold text-gray-600 text-lg">Ready to validate project integrity</p>
                        <p className="text-sm mt-2 max-w-sm">We will check image dimensions, audio sync, file availability, and timeline integrity.</p>
                    </div>
                )}

                {checking && (
                    <div className="text-center py-24 flex flex-col items-center justify-center h-full">
                        <div className="animate-spin text-teal-600 mb-6"><RotateCcw size={40} /></div>
                        <p className="text-gray-900 font-bold text-lg">Scanning project assets...</p>
                        <p className="text-gray-500 text-sm mt-2">This may take a few seconds.</p>
                    </div>
                )}

                {report && (
                    <div className={`rounded-xl border-2 p-8 transition-all ${statusColors[report.status]}`}>
                        <div className="flex items-start gap-6">
                            <div className="mt-1 flex-shrink-0">
                                {report.status === 'PASS' ? <CheckCircle className="text-green-600" size={40} /> :
                                    report.status === 'WARNING' ? <AlertCircle className="text-yellow-600" size={40} /> :
                                        <XCircle className="text-red-600" size={40} />}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-2xl font-bold mb-2 tracking-tight">Validation Status: {report.status}</h4>
                                <p className="text-base opacity-90 mb-8 font-medium leading-relaxed">
                                    {report.status === 'PASS'
                                        ? "All systems go. Your video is ready to render."
                                        : report.status === 'WARNING'
                                            ? "Ready to render, but please review the warnings below."
                                            : "Critical errors detected. Render blocked."}
                                </p>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-6 mb-8 bg-white/60 p-6 rounded-2xl border border-black/5">
                                    <div className="flex flex-col">
                                        <div className="text-[10px] uppercase font-bold opacity-50 tracking-wider mb-1">Est. Duration</div>
                                        <div className="font-mono font-bold text-2xl tracking-tight">{report.details?.total_duration?.toFixed(2)}s</div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-[10px] uppercase font-bold opacity-50 tracking-wider mb-1">Est. Frames</div>
                                        <div className="font-mono font-bold text-2xl tracking-tight">{report.details?.estimated_frames}</div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-[10px] uppercase font-bold opacity-50 tracking-wider mb-1">Target FPS</div>
                                        <div className="font-mono font-bold text-2xl tracking-tight">{report.details?.fps}</div>
                                    </div>
                                </div>

                                {/* Errors */}
                                {report.errors?.length > 0 && (
                                    <div className="mb-6 bg-red-100/50 p-6 rounded-2xl border border-red-100/50">
                                        <h5 className="text-xs font-bold uppercase text-red-800 mb-4 flex items-center gap-2">
                                            <XCircle size={16} /> Fatal Errors
                                        </h5>
                                        <ul className="list-none space-y-3">
                                            {report.errors.map((err, i) => (
                                                <li key={i} className="text-sm font-bold text-red-800 flex items-start gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                                                    {err}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Warnings */}
                                {report.warnings?.length > 0 && (
                                    <div className="mb-4 bg-yellow-100/50 p-6 rounded-2xl border border-yellow-100/50">
                                        <h5 className="text-xs font-bold uppercase text-yellow-800 mb-4 flex items-center gap-2">
                                            <AlertCircle size={16} /> Warnings
                                        </h5>
                                        <ul className="list-none space-y-3">
                                            {report.warnings.map((warn, i) => (
                                                <li key={i} className="text-sm font-bold text-yellow-900 flex items-start gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></span>
                                                    {warn}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

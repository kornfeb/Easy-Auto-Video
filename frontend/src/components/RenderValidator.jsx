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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldCheck size={24} className="text-indigo-500" /> Dry Run Validation
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Ensure all assets are ready before final rendering.</p>
                </div>

                <button
                    onClick={runCheck}
                    disabled={checking}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {checking ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
                    {checking ? 'Running Check...' : 'Run Diagnostics'}
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {!report && !checking && (
                    <div className="text-center py-12 text-gray-400">
                        <ShieldCheck size={48} className="mx-auto mb-4 text-gray-200" />
                        <p className="font-medium">Ready to validate project integrity.</p>
                        <p className="text-xs mt-1">Checks image dimensions, audio sync, and file availability.</p>
                    </div>
                )}

                {checking && (
                    <div className="text-center py-12">
                        <div className="animate-spin text-indigo-500 mb-4 mx-auto"><RotateCcw size={32} /></div>
                        <p className="text-gray-500 font-medium">Scanning project assets...</p>
                    </div>
                )}

                {report && (
                    <div className={`rounded-xl border-2 p-6 ${statusColors[report.status]}`}>
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                {report.status === 'PASS' ? <CheckCircle className="text-green-600" size={32} /> :
                                    report.status === 'WARNING' ? <AlertCircle className="text-yellow-600" size={32} /> :
                                        <XCircle className="text-red-600" size={32} />}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold mb-1">Validation Status: {report.status}</h4>
                                <p className="text-sm opacity-80 mb-6 font-medium">
                                    {report.status === 'PASS'
                                        ? "All systems go. Your video is ready to render."
                                        : report.status === 'WARNING'
                                            ? "Ready to render, but please review the warnings below."
                                            : "Critical errors detected. Render blocked."}
                                </p>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4 mb-6 bg-white/60 p-4 rounded-lg border border-black/5">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold opacity-50">Est. Duration</div>
                                        <div className="font-mono font-bold text-lg">{report.details?.total_duration?.toFixed(2)}s</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold opacity-50">Est. Frames</div>
                                        <div className="font-mono font-bold text-lg">{report.details?.estimated_frames}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold opacity-50">Target FPS</div>
                                        <div className="font-mono font-bold text-lg">{report.details?.fps}</div>
                                    </div>
                                </div>

                                {/* Errors */}
                                {report.errors?.length > 0 && (
                                    <div className="mb-4 bg-red-100/50 p-4 rounded-lg">
                                        <h5 className="text-xs font-bold uppercase text-red-700 mb-2 flex items-center gap-1">
                                            <XCircle size={14} /> Fatal Errors
                                        </h5>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {report.errors.map((err, i) => (
                                                <li key={i} className="text-sm font-medium text-red-800">{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Warnings */}
                                {report.warnings?.length > 0 && (
                                    <div className="mb-4 bg-yellow-100/50 p-4 rounded-lg">
                                        <h5 className="text-xs font-bold uppercase text-yellow-700 mb-2 flex items-center gap-1">
                                            <AlertCircle size={14} /> Warnings
                                        </h5>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {report.warnings.map((warn, i) => (
                                                <li key={i} className="text-sm font-medium text-yellow-900">{warn}</li>
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

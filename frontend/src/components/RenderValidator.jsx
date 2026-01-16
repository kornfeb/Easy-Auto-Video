import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, AlertTriangle, XCircle, RotateCcw, Play } from 'lucide-react';
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

    const statusIcons = {
        PASS: <CheckCircle className="text-green-600" size={24} />,
        WARNING: <AlertTriangle className="text-yellow-600" size={24} />,
        FAIL: <XCircle className="text-red-600" size={24} />
    };

    return (
        <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={16} /> Pre-Flight Validation
                </h3>
                {!report && (
                    <button
                        onClick={runCheck}
                        disabled={checking}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        {checking ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} />}
                        {checking ? 'CHECKING...' : 'RUN DRY CHECK'}
                    </button>
                )}
            </div>

            {report && (
                <div className={`rounded-xl border-2 p-6 ${statusColors[report.status]}`}>
                    <div className="flex items-start gap-4">
                        <div className="mt-1">{statusIcons[report.status]}</div>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold mb-1">Validation Status: {report.status}</h4>
                            <p className="text-sm opacity-80 mb-4">
                                {report.status === 'PASS'
                                    ? "All systems go. Your video is ready to render."
                                    : report.status === 'WARNING'
                                        ? "Ready to render, but please review the warnings below."
                                        : "Critical errors detected. Render blocked."}
                            </p>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-4 bg-white/50 p-3 rounded-lg">
                                <div>
                                    <div className="text-[10px] uppercase font-bold opacity-50">Est. Duration</div>
                                    <div className="font-mono font-bold">{report.details?.total_duration?.toFixed(2)}s</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold opacity-50">Est. Frames</div>
                                    <div className="font-mono font-bold">{report.details?.estimated_frames}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold opacity-50">FPS</div>
                                    <div className="font-mono font-bold">{report.details?.fps}</div>
                                </div>
                            </div>

                            {/* Errors */}
                            {report.errors?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-xs font-bold uppercase text-red-600 mb-2 flex items-center gap-1">
                                        <XCircle size={12} /> Fatal Errors
                                    </h5>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {report.errors.map((err, i) => (
                                            <li key={i} className="text-xs font-medium text-red-700">{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {report.warnings?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-xs font-bold uppercase text-yellow-600 mb-2 flex items-center gap-1">
                                        <AlertTriangle size={12} /> Warnings
                                    </h5>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {report.warnings.map((warn, i) => (
                                            <li key={i} className="text-xs font-medium text-yellow-800">{warn}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={runCheck}
                                    className="text-xs font-bold underline opacity-60 hover:opacity-100"
                                >
                                    Re-run Check
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

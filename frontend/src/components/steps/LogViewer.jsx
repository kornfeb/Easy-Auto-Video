import React, { useState, useEffect } from 'react';
import { FileText, Download, Terminal } from 'lucide-react';
import { API_URL } from '../../config';

export default function LogViewer({ projectId, lastUpdated }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, INFO, ERROR

    useEffect(() => {
        fetch(`${API_URL}/projects/${projectId}/logs`)
            .then(res => res.json())
            .then(data => {
                setLogs(data.lines || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load logs", err);
                setLoading(false);
            });
    }, [projectId, lastUpdated]);

    const filteredLogs = logs.filter(line => {
        if (filter === 'ALL') return true;
        return line.toUpperCase().includes(filter);
    });

    // Show latest logs first
    const displayLogs = [...filteredLogs].reverse();

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Terminal size={28} className="text-gray-600" /> System Logs
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Trace execution events and errors.</p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        {['ALL', 'INFO', 'ERROR'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${filter === f
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <a
                        href={`${API_URL}/projects/${projectId}/logs/download`}
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition shadow-md"
                    >
                        <Download size={14} /> Export Logs
                    </a>
                </div>
            </div>

            <div className="bg-gray-950 rounded-xl border border-gray-800 p-6 font-mono text-xs text-gray-300 flex-1 overflow-hidden flex flex-col shadow-2xl">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                    {loading ? (
                        <div className="text-center py-20 opacity-30 flex flex-col items-center">
                            <div className="animate-spin mb-4 text-blue-500"><Terminal size={32} /></div>
                            Initializing log stream...
                        </div>
                    ) : displayLogs.length === 0 ? (
                        <div className="text-center py-20 opacity-30 italic">
                            {logs.length === 0 ? 'Log file is empty.' : 'No entries match your filter.'}
                        </div>
                    ) : (
                        displayLogs.map((line, i) => (
                            <div key={i} className={`whitespace-pre-wrap py-0.5 border-l-2 pl-3 ${line.includes('ERROR') || line.includes('FAIL') ? 'text-red-400 border-red-500 bg-red-900/10' :
                                line.includes('WARNING') ? 'text-yellow-400 border-yellow-500' :
                                    line.includes('SUCCESS') || line.includes('PASS') ? 'text-green-400 border-green-500' :
                                        'text-gray-400 border-transparent hover:bg-white/5'
                                }`}>
                                {line}
                            </div>
                        ))
                    )}
                </div>
                <div className="pt-3 border-t border-gray-800 mt-2 text-[10px] text-gray-600 flex justify-between">
                    <span>buf: {logs.length} lines</span>
                    <span>LATEST EVENTS UP</span>
                </div>
            </div>
        </div>
    );
}

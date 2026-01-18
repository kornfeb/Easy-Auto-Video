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
            <div className="flex justify-between items-end border-b border-gray-100 pb-6 mb-8 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                            <Terminal size={24} />
                        </div>
                        System Logs
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-11">Trace execution events and errors.</p>
                </div>

                <div className="flex gap-3 items-center">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {['ALL', 'INFO', 'ERROR'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <a
                        href={`${API_URL}/projects/${projectId}/logs/download`}
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-black transition shadow-lg active:scale-95"
                    >
                        <Download size={14} /> Export
                    </a>
                </div>
            </div>

            <div className="bg-gray-950 rounded-2xl border border-gray-900 p-0 font-mono text-xs text-gray-300 flex-1 overflow-hidden flex flex-col shadow-2xl relative group">
                {/* Console Header */}
                <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <span>Console Output</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Live</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 bg-[#0d1117]">
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
                            <div key={i} className={`whitespace-pre-wrap py-1 px-2 border-l-2 rounded-sm transition-opacity ${line.includes('ERROR') || line.includes('FAIL') ? 'text-red-400 border-red-500 bg-red-500/10' :
                                line.includes('WARNING') ? 'text-yellow-400 border-yellow-500 bg-yellow-500/5' :
                                    line.includes('SUCCESS') || line.includes('PASS') ? 'text-green-400 border-green-500 bg-green-500/5' :
                                        'text-gray-400 border-transparent hover:bg-white/5 opacity-80 hover:opacity-100'
                                }`}>
                                <span className="opacity-30 mr-3 select-none text-[10px]">{displayLogs.length - i}</span>
                                {line}
                            </div>
                        ))
                    )}
                </div>
                <div className="px-4 py-2 border-t border-gray-800 bg-gray-900 text-[10px] text-gray-600 flex justify-between font-bold uppercase tracking-wider">
                    <span>Buffer: {logs.length} lines</span>
                    <span>Easy Auto Video v1.0</span>
                </div>
            </div>
        </div>
    );
}

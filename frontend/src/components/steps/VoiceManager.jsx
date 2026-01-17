import React, { useState, useEffect } from 'react';
import { Mic, Sparkles, Activity, Volume2, RotateCcw, RefreshCw, FileAudio, CheckCircle, Trash2 } from 'lucide-react';
import { API_URL } from '../../config';

export default function VoiceManager({ projectId, lastUpdated, projectData, onUpdate }) {
    const [profiles, setProfiles] = useState([]);
    const [voiceFiles, setVoiceFiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState('');
    const [speed, setSpeed] = useState(1.0);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [profRes, fileRes] = await Promise.all([
                fetch(`${API_URL}/voice/profiles`),
                fetch(`${API_URL}/projects/${projectId}/voice/files`)
            ]);
            const profs = await profRes.json();
            const files = await fileRes.json();
            setProfiles(profs);
            setVoiceFiles(files);
            if (profs.length > 0 && !selectedProfile) {
                const defaultProf = profs.find(p => p.id === 'oa_echo') || profs[0];
                setSelectedProfile(defaultProf.id);
            }
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch voice data", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [projectId, lastUpdated]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const scriptRes = await fetch(`${API_URL}/projects/${projectId}/script`);
            const scriptData = await scriptRes.json();
            const scriptText = scriptData.content;
            const profile = profiles.find(p => p.id === selectedProfile);

            if (!profile) { alert("Invalid voice profile"); setGenerating(false); return; }
            if (!scriptText || scriptText.trim().length < 5) {
                alert("Script is too short or empty.");
                setGenerating(false);
                return;
            }

            const payload = {
                profile_id: selectedProfile,
                text: scriptText,
                provider: profile.service,
                voice: profile.voice || profile.lang || 'th',
                speed: parseFloat(speed)
            };

            const res = await fetch(`${API_URL}/projects/${projectId}/voice/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchData();
                onUpdate();
            } else {
                const errData = await res.json();
                alert(`Error: ${errData.detail || "Failed"}`);
            }
        } catch (err) {
            alert("Critical error during voice generation.");
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (filename) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/voice/${filename}`, { method: 'DELETE' });
            if (res.ok) { await fetchData(); onUpdate(); }
        } catch (err) { alert("Delete failed"); }
    };

    const handleActivate = async (filename) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/voice/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            if (res.ok) { await fetchData(); onUpdate(); }
        } catch (err) { alert("Activation failed"); }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading voice studio...</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Mic size={28} className="text-blue-600" /> Voice Studio
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Generate AI narration from your script.</p>
                </div>
                <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-bold uppercase tracking-wide border border-indigo-100">
                    <Sparkles size={14} className="text-indigo-500" /> AI Neural Engine Ready
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Voice Control */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Activity size={14} /> Profile & Settings
                    </h3>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedProfile(p.id)}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedProfile === p.id ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${p.service === 'openai' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {p.service}
                                            </span>
                                            {p.preview && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); new Audio(`${API_URL}${p.preview}`).play(); }}
                                                    className="p-1.5 bg-white text-blue-500 rounded-full shadow-sm hover:scale-110 transition active:scale-95 border border-gray-100"
                                                >
                                                    <Volume2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="font-bold text-gray-800 text-sm mt-1">{p.name}</div>
                                        <div className="text-[10px] text-gray-500 font-medium italic">{p.tone}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                            <label className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-tight">
                                <span>Speaking Rate</span>
                                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-mono">{speed}x</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(e.target.value)}
                                className="w-full h-2 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-2 uppercase">
                                <span>Slow (0.5x)</span>
                                <span>Normal (1.0x)</span>
                                <span>Fast (2.0x)</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-gray-200 transition-all active:scale-[0.98]"
                        >
                            {generating ? <RotateCcw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                            {generating ? 'GENERATING...' : 'GENERATE VOICE'}
                        </button>
                    </div>
                </div>

                {/* Generated Files */}
                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 border-dashed">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <FileAudio size={14} /> Generated Takes
                    </h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {voiceFiles.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 text-sm italic flex flex-col items-center">
                                <Mic className="mb-3 opacity-20" size={48} />
                                No voice variants generated yet.
                            </div>
                        ) : (
                            voiceFiles.map((file, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${file.filename === 'voice.mp3' ? 'border-green-300 ring-2 ring-green-50 z-10' : 'border-gray-100 opacity-80 hover:opacity-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${file.filename === 'voice.mp3' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500'}`}>
                                                {file.filename === 'voice.mp3' ? <CheckCircle size={18} /> : <FileAudio size={18} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-bold text-gray-800 max-w-[150px] truncate" title={file.filename}>{file.filename}</div>
                                                    {file.filename === 'voice.mp3' && <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Active</span>}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                                                    {file.label ? <span className="text-blue-600 font-bold">{file.label}</span> :
                                                        <span className="flex items-center gap-2 font-medium">{file.profile_id} • {file.speed}x</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {file.filename !== 'voice.mp3' && (
                                                <>
                                                    <button
                                                        onClick={() => handleActivate(file.filename)}
                                                        className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition border border-blue-100"
                                                    >
                                                        Set Active
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(file.filename)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                                        <audio controls className="h-8 flex-1 w-full" src={`${API_URL}${file.url}?t=${new Date(projectData.last_updated).getTime()}`}>
                                            Your browser does not support audio.
                                        </audio>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

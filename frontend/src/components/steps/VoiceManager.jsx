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
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Mic size={24} />
                        </div>
                        Voice Studio
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-11">Generate AI narration from your script.</p>
                </div>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wide border border-indigo-100 flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500" /> AI Neural Engine Ready
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Voice Control */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Activity size={14} /> Profile & Settings
                    </h3>

                    <div className="space-y-8">
                        {/* Profiles Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedProfile(p.id)}
                                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all group ${selectedProfile === p.id ? 'border-indigo-600 bg-indigo-50/30 shadow-md ring-0' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'}`}
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide ${p.service === 'openai' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                {p.service}
                                            </span>
                                            {p.preview && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); new Audio(`${API_URL}${p.preview}`).play(); }}
                                                    className="p-2 bg-white text-indigo-600 rounded-full shadow-sm hover:bg-indigo-600 hover:text-white transition-all border border-gray-100"
                                                    title="Preview Voice"
                                                >
                                                    <Volume2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-base">{p.name}</div>
                                            <div className="text-xs text-gray-500 font-medium mt-0.5">{p.tone}</div>
                                        </div>
                                    </div>
                                    {selectedProfile === p.id && (
                                        <div className="absolute top-2 right-2 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white shadow-sm"></div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Speed Control */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <label className="flex items-center justify-between text-xs font-bold text-gray-600 mb-4 uppercase tracking-wide">
                                <span>Speaking Rate</span>
                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-mono">{speed}x</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(e.target.value)}
                                className="w-full h-2 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-wider">
                                <span>Slow (0.5x)</span>
                                <span>Normal (1.0x)</span>
                                <span>Fast (2.0x)</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full h-14 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase tracking-wide text-sm"
                        >
                            {generating ? <RotateCcw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                            {generating ? 'GENERATING VOICE...' : 'GENERATE VOICE'}
                        </button>
                    </div>
                </div>

                {/* Generated Files */}
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <FileAudio size={14} /> Generated Takes
                    </h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {voiceFiles.length === 0 ? (
                            <div className="text-center py-24 text-gray-400 text-sm flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                <div className="p-4 bg-gray-50 rounded-full mb-4 text-gray-300"><Mic size={32} /></div>
                                <span className="font-bold text-gray-500">No voice takes yet</span>
                                <span className="text-xs text-gray-400 mt-1">Generate your first take to see it here.</span>
                            </div>
                        ) : (
                            voiceFiles.map((file, idx) => {
                                const isActive = file.filename === 'voice.mp3';
                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white p-5 rounded-xl border transition-all ${isActive ? 'border-green-400 shadow-md ring-1 ring-green-100' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${isActive ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                                    {isActive ? <CheckCircle size={20} /> : <FileAudio size={20} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-bold text-gray-900 max-w-[180px] truncate" title={file.filename}>{file.filename}</div>
                                                        {isActive && <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wide">Active</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 font-mono">
                                                        {file.label ? <span className="text-blue-600 font-bold bg-blue-50 px-1.5 rounded">{file.label}</span> :
                                                            <span className="flex items-center gap-1"><span className="font-bold text-gray-400">ID:</span> {file.profile_id} <span className="text-gray-300">|</span> <span className="font-bold text-gray-400">SPD:</span> {file.speed}x</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isActive && (
                                                    <>
                                                        <button
                                                            onClick={() => handleActivate(file.filename)}
                                                            className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition border border-blue-100 hover:border-blue-200"
                                                        >
                                                            Use This
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(file.filename)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Delete Take"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                                            <audio controls className="w-full h-8" src={`${API_URL}${file.url}?t=${new Date(projectData.last_updated).getTime()}`}>
                                                Your browser does not support audio.
                                            </audio>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

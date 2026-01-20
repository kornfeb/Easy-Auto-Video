import React, { useState, useEffect } from 'react';
import { Mic, Sparkles, Activity, Volume2, RotateCcw, Play, FileAudio, CheckCircle, Trash2 } from 'lucide-react';
import { API_URL } from '../../config';

export default function VoiceManager({ projectId, lastUpdated, projectData, onUpdate }) {
    const [profiles, setProfiles] = useState([]);
    const [voiceFiles, setVoiceFiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState('');
    const [speed, setSpeed] = useState(1.0);
    const [style, setStyle] = useState('Read aloud in a warm and friendly tone');
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
                const defaultProf = profs.find(p => p.id === 'gm_sadaltager') || profs[0];
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
                speed: parseFloat(speed),
                style: profile.service === 'gemini' ? style : undefined
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
                <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-100 flex items-center gap-2 shadow-sm">
                    <Sparkles size={14} className="text-indigo-500" /> Powered by Gemini 2.5 TTS
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
                                    className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all group ${selectedProfile === p.id ? 'border-indigo-600 bg-indigo-50/30 shadow-md ring-0 z-10 scale-[1.02]' : 'border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-sm'}`}
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                {p.service}
                                            </span>
                                            {p.preview && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); new Audio(`${API_URL}${p.preview}`).play(); }}
                                                    className="p-1.5 bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-600 hover:text-white transition-all border border-gray-100"
                                                >
                                                    <Volume2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 text-base tracking-tight">{p.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{p.tone}</div>
                                        </div>
                                    </div>
                                    {selectedProfile === p.id && (
                                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-indigo-600 rounded-full border-[3px] border-white shadow-lg flex items-center justify-center text-white">
                                            <CheckCircle size={10} strokeWidth={4} />
                                        </div>
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

                        {/* Style Control (Mandatory for Gemini) */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50 space-y-4">
                            <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                                <Sparkles size={14} className="text-indigo-500" /> Style & Tone Instructions (Thai Default)
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full h-14 pl-12 pr-6 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 transition-all text-gray-800 font-bold shadow-inner"
                                    placeholder="เช่น ตื่นเต้น, น่าเชื่อถือ, หรือนุ่มนวล..."
                                />
                                <Sparkles size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-1">
                                บรรยายอารมณ์หรือสไตล์การพูดเพื่อให้ AI ประมวลผลได้แม่นยำขึ้น
                            </p>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full h-16 bg-gray-900 text-white font-black rounded-2xl hover:bg-black disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-widest text-sm active:scale-95"
                        >
                            {generating ? <RotateCcw size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                            {generating ? 'Processing AI Audio...' : 'Generate Neural Voice'}
                        </button>
                    </div>
                </div>

                {/* Generated Files */}
                <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2 px-2">
                        <FileAudio size={16} className="text-indigo-400" /> Professional Takes
                    </h3>
                    <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                        {voiceFiles.length === 0 ? (
                            <div className="text-center py-32 text-gray-400 text-sm flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[2rem] bg-white shadow-inner">
                                <div className="p-6 bg-gray-50 rounded-full mb-6 text-gray-200"><Mic size={48} /></div>
                                <span className="font-black text-gray-900 uppercase tracking-widest text-xs">No takes registered</span>
                                <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Generate from script above</span>
                            </div>
                        ) : (
                            voiceFiles.map((file, idx) => {
                                const isActive = file.filename === 'voice.mp3';
                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white p-6 rounded-3xl border transition-all ${isActive ? 'border-green-400 shadow-xl shadow-green-50 ring-4 ring-green-100/30' : 'border-gray-50 shadow-sm hover:border-gray-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-5">
                                                <div className={`p-4 rounded-2xl ${isActive ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-900 text-white shadow-lg shadow-gray-100'}`}>
                                                    {isActive ? <CheckCircle size={24} /> : <Volume2 size={24} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-sm font-black text-gray-900 max-w-[200px] truncate tracking-tight" title={file.filename}>{file.filename}</div>
                                                        {isActive && <span className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Active</span>}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2 font-black uppercase tracking-widest">
                                                        {file.label ? <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{file.label}</span> :
                                                            <span className="flex items-center gap-1">Model: {file.profile_id} <span className="text-gray-200 mx-1">/</span> Speed: {file.speed}x</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 px-1 pt-1">
                                                {!isActive && (
                                                    <>
                                                        <button
                                                            onClick={() => handleActivate(file.filename)}
                                                            className="h-10 px-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                                                        >
                                                            Select Take
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(file.filename)}
                                                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                                            <audio controls className="w-full h-10" src={`${API_URL}${file.url}?t=${new Date(projectData.last_updated).getTime()}`}>
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

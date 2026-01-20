import React, { useState, useEffect } from 'react';
import { Mic, Play, RotateCcw, Sparkles, Volume2, Info, MessageSquare, Wand } from 'lucide-react';
import { API_URL } from '../../config';

export default function VoiceSandbox() {
    const [text, setText] = useState('สวัสดีครับ ยินดีต้อนรับสู่ระบบอัตโนมัติ Easy Auto Video');
    const [style, setStyle] = useState('สดใสและเป็นกันเอง');
    const [selectedVoice, setSelectedVoice] = useState('Puck');
    const [voices, setVoices] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch available Gemini voices from backend
        fetch(`${API_URL}/voice/gemini/voices`)
            .then(res => res.json())
            .then(data => {
                setVoices(data);
                if (data.length > 0 && !selectedVoice) {
                    setSelectedVoice(data[0].id);
                }
            })
            .catch(err => console.error("Failed to fetch voices", err));
    }, []);

    const handleGenerate = async () => {
        if (!text.trim()) return;
        setGenerating(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/tts/gemini/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    voice: selectedVoice,
                    style: style
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to generate audio");
            }

            // Convert binary response to blob URL
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-fadeIn">
            <div className="flex justify-between items-end border-b border-gray-100 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 flex items-center gap-4 tracking-tight">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <Mic size={28} />
                        </div>
                        Gemini Voice Sandbox
                    </h2>
                    <p className="text-base text-gray-500 mt-2 ml-16 font-medium">Directly experiment with next-gen Gemini Text-to-Speech models.</p>
                </div>
                <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-xs font-black uppercase tracking-wider border border-purple-100 flex items-center gap-2 shadow-sm">
                    <Sparkles size={14} className="text-purple-500" /> Powered by Gemini 2.5 TTS
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                {/* Controls - Left side */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-xl shadow-gray-100/50 space-y-8">
                        {/* Text Input */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                <MessageSquare size={14} /> Text Content
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full h-44 p-6 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 transition-all text-gray-800 leading-relaxed font-medium resize-none shadow-inner"
                                placeholder="Enter text in Thai or English..."
                            />
                        </div>

                        {/* Style Instructions */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                <Wand size={14} /> Style & Delivery Instructions
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full h-14 pl-12 pr-6 bg-gray-50 border-none rounded-xl focus:ring-4 focus:ring-indigo-100 transition-all text-gray-800 font-bold shadow-inner"
                                    placeholder="e.g. Energetic and fast, or soft and whispering..."
                                />
                                <Sparkles size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-1">
                                Tip: You can describe emotions, accents, or specific character types.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            {/* Voice Selector */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                                    <Volume2 size={14} /> Select Voice Model
                                </label>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-bold text-gray-700 shadow-sm appearance-none cursor-pointer"
                                >
                                    {voices.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col justify-end">
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating || !text.trim()}
                                    className="h-14 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 active:scale-95"
                                >
                                    {generating ? <RotateCcw size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                                    {generating ? 'Processing AI Audio...' : 'Generate Crystal Audio'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-3">
                                <Info size={16} /> {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Card - Right side */}
                <div className="lg:col-span-2">
                    <div className="sticky top-8 space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-200 text-white relative overflow-hidden group">
                            {/* Decorative background blur */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>

                            <div className="relative z-10 space-y-8 text-center">
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl mx-auto flex items-center justify-center border border-white/30 shadow-inner">
                                    <Volume2 size={36} />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black tracking-tight mb-2">Audio Preview</h3>
                                    <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em]">{selectedVoice} Model Ready</p>
                                </div>

                                <div className="space-y-6">
                                    {audioUrl ? (
                                        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20">
                                            <audio controls src={audioUrl} className="w-full h-10 accent-white" autoPlay />
                                        </div>
                                    ) : (
                                        <div className="h-20 flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/20 rounded-2xl">
                                            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Generation</p>
                                        </div>
                                    )}

                                    {audioUrl && (
                                        <button
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = audioUrl;
                                                a.download = `gemini-tts-${selectedVoice}-${Date.now()}.wav`;
                                                a.click();
                                            }}
                                            className="w-full py-4 text-[10px] font-black uppercase tracking-widest border border-white/20 rounded-xl hover:bg-white/10 transition-colors"
                                        >
                                            Download Preview File
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Integration Hook Explanation */}
                        <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Info size={14} /> Pipeline Connectivity
                            </h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                                Once you find a voice you like, these parameters can be transferred to the <span className="font-bold text-indigo-600">Voice Manager</span> step.
                                FFmpeg integration will use these audio tracks as the primary narration layer in the final composite.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

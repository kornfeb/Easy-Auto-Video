import React, { useState, useEffect, useRef } from 'react';
import {
    Settings, FileText, Clock, Mic, Music, Sliders, RefreshCw
} from 'lucide-react';
import { API_URL } from '../../config';

// Default empty state to prevent crashes
const DEFAULT_SETTINGS = {
    script: { word_count: 40, template: "" },
    video: { duration: 20, intro_silence: 3.0, outro_silence: 1.5 },
    voice: { provider: "openai", profile: "alloy", speed: 1.0, breathing_pause: false },
    music: { track: "", volume: 0.2, duck_voice: true },
    mix: { voice_gain: 1.0, music_gain: 0.2 }
};

export default function SettingsManager({ projectId, onUpdate }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Voices List
    const [voices, setVoices] = useState([]);
    // Music List
    const [tracks, setTracks] = useState([]);

    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                // 1. Load Settings
                const sRes = await fetch(`${API_URL}/projects/${projectId}/settings`);
                if (sRes.ok) {
                    const sData = await sRes.json();
                    if (mounted) {
                        // Deep merge with defaults to prevent crashes on missing keys
                        setSettings(prev => ({
                            ...prev,
                            ...sData,
                            script: { ...prev.script, ...(sData.script || {}) },
                            video: { ...prev.video, ...(sData.video || {}) },
                            voice: { ...prev.voice, ...(sData.voice || {}) },
                            music: { ...prev.music, ...(sData.music || {}) },
                            mix: { ...prev.mix, ...(sData.mix || {}) },
                        }));
                    }
                }

                // 2. Load Assets (Voices)
                const vRes = await fetch(`${API_URL}/voice/profiles`);
                if (vRes.ok) {
                    const vData = await vRes.json();
                    if (mounted && Array.isArray(vData)) setVoices(vData);
                }

                // 3. Load Assets (Music)
                const mRes = await fetch(`${API_URL}/music/files`);
                if (mRes.ok) {
                    const mData = await mRes.json();
                    if (mounted && Array.isArray(mData)) setTracks(mData);
                }

            } catch (err) {
                console.error("Failed to load settings/assets", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();

        return () => { mounted = false; };
    }, [projectId]);

    const handleChange = (section, key, value) => {
        if (!settings) return;

        const newSettings = {
            ...settings,
            [section]: {
                ...settings[section],
                [key]: value
            }
        };
        setSettings(newSettings);

        // Debounce Save
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaving(true);
        saveTimeoutRef.current = setTimeout(() => {
            saveSettings(newSettings);
        }, 1000); // 1s debounce
    };

    const saveSettings = async (payload) => {
        try {
            await fetch(`${API_URL}/projects/${projectId}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Save failed", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="p-10 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw size={24} className="animate-spin mb-2" />
            <p>Loading configuration...</p>
        </div>
    );

    // Safety checks before render
    const s = settings || DEFAULT_SETTINGS;
    const script = s.script || DEFAULT_SETTINGS.script;
    const video = s.video || DEFAULT_SETTINGS.video;
    const voice = s.voice || DEFAULT_SETTINGS.voice;
    const music = s.music || DEFAULT_SETTINGS.music;
    const mix = s.mix || DEFAULT_SETTINGS.mix;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                            <Settings size={24} />
                        </div>
                        Project Settings
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-11">Configure global defaults for this project.</p>
                </div>
                <div className={`text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 transition-all ${saving ? 'opacity-100 bg-amber-50 text-amber-700' : 'opacity-0'}`}>
                    <RefreshCw size={14} className="animate-spin" /> Saving Changes...
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. SCRIPT SETTINGS */}
                <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm col-span-1 md:col-span-2">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                            <FileText size={16} />
                        </div>
                        Script Configuration
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-3">Word Count Target</label>
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <input
                                        type="range" min="20" max="100" step="5"
                                        value={script.word_count || 40}
                                        onChange={(e) => handleChange('script', 'word_count', parseInt(e.target.value))}
                                        className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <span className="text-lg font-mono font-bold w-12 text-center text-blue-600">{script.word_count}</span>
                                </div>
                                <div className="flex gap-2 justify-between">
                                    {[20, 30, 40, 60].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => handleChange('script', 'word_count', val)}
                                            className="flex-1 text-[10px] bg-white border border-gray-200 px-2 py-1.5 rounded-lg hover:border-blue-400 hover:text-blue-600 text-gray-500 font-bold transition-all"
                                        >
                                            {val}w
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1 lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-3">AI Prompt Template</label>
                            <div className="relative">
                                <textarea
                                    value={script.template || ""}
                                    onChange={(e) => handleChange('script', 'template', e.target.value)}
                                    placeholder="Enter custom instructions for the AI script writer..."
                                    className="w-full h-32 p-4 text-xs font-mono leading-relaxed border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none transition-all placeholder:text-gray-300"
                                />
                                <div className="absolute bottom-3 right-3 flex gap-2">
                                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-400 font-mono" title="Product Name variable">{`{{product_name}}`}</span>
                                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-400 font-mono" title="Tone variable">{`{{tone}}`}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. VIDEO TIMING */}
                <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
                            <Clock size={16} />
                        </div>
                        Video Timing
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Target Duration</label>
                            <div className="flex items-center gap-2 relative">
                                <input
                                    type="number"
                                    value={video.duration || 20}
                                    onChange={(e) => handleChange('video', 'duration', parseInt(e.target.value))}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                                />
                                <span className="absolute right-4 text-xs font-bold text-gray-400 uppercase">sec</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Intro Silence</label>
                                <div className="relative">
                                    <input
                                        type="number" step="0.1"
                                        value={video.intro_silence || 3.0}
                                        onChange={(e) => handleChange('video', 'intro_silence', parseFloat(e.target.value))}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-medium focus:border-emerald-400 outline-none"
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-gray-400 font-bold">S</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Outro Silence</label>
                                <div className="relative">
                                    <input
                                        type="number" step="0.1"
                                        value={video.outro_silence || 1.5}
                                        onChange={(e) => handleChange('video', 'outro_silence', parseFloat(e.target.value))}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-medium focus:border-emerald-400 outline-none"
                                    />
                                    <span className="absolute right-3 top-2.5 text-[10px] text-gray-400 font-bold">S</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${video.ken_burns_enabled !== false ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-gray-300'}`}>
                                    {video.ken_burns_enabled !== false && <div className="bg-white w-2 h-2 rounded-full" />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={video.ken_burns_enabled !== false}
                                    onChange={(e) => handleChange('video', 'ken_burns_enabled', e.target.checked)}
                                    className="hidden"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-700 font-bold group-hover:text-emerald-700 transition-colors">Default Ken Burns Motion</span>
                                    <span className="text-[10px] text-gray-400 font-medium tracking-tight">Apply subtle pans & zooms to all image segments by default.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </section>

                {/* 3. AUDIO MIXING */}
                <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                            <Sliders size={16} />
                        </div>
                        Audio Mixing
                    </h3>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-700 uppercase">Voice Gain</label>
                                <span className="text-xs font-mono font-bold text-indigo-600">{((mix.voice_gain || 1.0) * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="2" step="0.1"
                                value={mix.voice_gain || 1.0}
                                onChange={(e) => handleChange('mix', 'voice_gain', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-700 uppercase">Music Gain</label>
                                <span className="text-xs font-mono font-bold text-indigo-600">{((mix.music_gain || 0.2) * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={mix.music_gain || 0.2}
                                onChange={(e) => handleChange('mix', 'music_gain', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </div>
                </section>

                {/* 4. VOICE DEFAULTS */}
                <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded">
                            <Mic size={16} />
                        </div>
                        Voice Defaults
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Default Voice</label>
                            <select
                                value={`${voice.provider}:${voice.profile}`}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value.includes(':')) {
                                        const [prov, prof] = value.split(':');
                                        handleChange('voice', 'provider', prov);
                                        handleChange('voice', 'profile', prof);
                                    }
                                }}
                                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all"
                            >
                                {Array.isArray(voices) && voices.map(v => (
                                    <option key={v.id} value={`${v.provider}:${v.id}`}>{v.name} ({v.provider})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-700 uppercase">Speech Speed</label>
                                <span className="text-xs font-mono font-bold text-purple-600">{voice.speed || 1.0}x</span>
                            </div>
                            <input
                                type="range" min="0.5" max="2.0" step="0.1"
                                value={voice.speed || 1.0}
                                onChange={(e) => handleChange('voice', 'speed', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                        </div>
                    </div>
                </section>

                {/* 5. MUSIC DEFAULTS */}
                <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded">
                            <Music size={16} />
                        </div>
                        Music Defaults
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Default Track</label>
                            <select
                                value={music.track || ""}
                                onChange={(e) => handleChange('music', 'track', e.target.value)}
                                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-rose-100 focus:border-rose-400 outline-none transition-all"
                            >
                                <option value="">(None)</option>
                                {Array.isArray(tracks) && tracks.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-700 uppercase">Volume</label>
                                <span className="text-xs font-mono font-bold text-rose-600">{Math.round((music.volume || 0.2) * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={music.volume || 0.2}
                                onChange={(e) => handleChange('music', 'volume', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                            />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${music.duck_voice ? 'bg-rose-600 border-rose-600' : 'bg-white border-gray-300'}`}>
                                {music.duck_voice && <div className="bg-white w-2 h-2 rounded-full" />}
                            </div>
                            <input
                                type="checkbox"
                                checked={music.duck_voice || false}
                                onChange={(e) => handleChange('music', 'duck_voice', e.target.checked)}
                                className="hidden"
                            />
                            <span className="text-sm text-gray-600 font-medium group-hover:text-rose-700 transition-colors">Auto-duck under voice</span>
                        </label>
                    </div>
                </section>
            </div>
        </div>
    );
}

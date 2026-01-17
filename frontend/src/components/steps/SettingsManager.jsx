import React, { useState, useEffect, useRef } from 'react';
import {
    Settings, FileText, Clock, Mic, Music, Sliders, RefreshCw
} from 'lucide-react';
import { API_URL } from '../../config';

// Default empty state to prevent crashes
const DEFAULT_SETTINGS = {
    script: { word_count: 40, template: "" },
    video: { duration: 20, intro_silence: 1.5, outro_silence: 1.5 },
    voice: { provider: "openai", profile: "alloy", speed: 1.0, breathing_pause: true },
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
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Settings size={28} className="text-gray-600" /> Project Settings
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Configure global defaults for this project.</p>
                </div>
                <div className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 transition-opacity ${saving ? 'opacity-100 bg-yellow-100 text-yellow-700' : 'opacity-0'}`}>
                    <RefreshCw size={12} className="animate-spin" /> Saving...
                </div>
            </div>

            <div className="space-y-8">

                {/* 1. SCRIPT SETTINGS */}
                <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                        <FileText size={16} className="text-blue-500" /> Script Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Word Count Target</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range" min="20" max="100" step="5"
                                    value={script.word_count || 40}
                                    onChange={(e) => handleChange('script', 'word_count', parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-mono font-bold w-12 text-center">{script.word_count}</span>
                            </div>
                            <div className="flex justify-between mt-2">
                                {[20, 30, 40, 60].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => handleChange('script', 'word_count', val)}
                                        className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 text-gray-600 font-medium"
                                    >
                                        {val}w
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">AI Prompt Template</label>
                            <textarea
                                value={script.template || ""}
                                onChange={(e) => handleChange('script', 'template', e.target.value)}
                                className="w-full h-32 p-3 text-xs font-mono border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                            <p className="text-[10px] text-gray-400 mt-2">
                                Variables: <code className="bg-gray-100 px-1 rounded">{`{{product_name}}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{{tone}}`}</code>, <code className="bg-gray-100 px-1 rounded">{`{{product_benefits}}`}</code>
                            </p>
                        </div>
                    </div>
                </section>

                {/* 2. VIDEO TIMING */}
                <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                        <Clock size={16} className="text-green-500" /> Video Timing
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Duration</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={video.duration || 20}
                                    onChange={(e) => handleChange('video', 'duration', parseInt(e.target.value))}
                                    className="w-full p-2 border rounded-lg font-mono text-sm"
                                />
                                <span className="text-xs text-gray-500">sec</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Intro Silence</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" step="0.1"
                                    value={video.intro_silence || 1.5}
                                    onChange={(e) => handleChange('video', 'intro_silence', parseFloat(e.target.value))}
                                    className="w-full p-2 border rounded-lg font-mono text-sm"
                                />
                                <span className="text-xs text-gray-500">sec</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Outro Silence</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" step="0.1"
                                    value={video.outro_silence || 1.5}
                                    onChange={(e) => handleChange('video', 'outro_silence', parseFloat(e.target.value))}
                                    className="w-full p-2 border rounded-lg font-mono text-sm"
                                />
                                <span className="text-xs text-gray-500">sec</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. VOICE & MUSIC */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Voice */}
                    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <Mic size={16} className="text-purple-500" /> Voice Defaults
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Default Voice</label>
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
                                    className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                                >
                                    {Array.isArray(voices) && voices.map(v => (
                                        <option key={v.id} value={`${v.provider}:${v.id}`}>{v.name} ({v.provider})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Speech Speed: {voice.speed || 1.0}x</label>
                                <input
                                    type="range" min="0.5" max="2.0" step="0.1"
                                    value={voice.speed || 1.0}
                                    onChange={(e) => handleChange('voice', 'speed', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={voice.breathing_pause || false}
                                    onChange={(e) => handleChange('voice', 'breathing_pause', e.target.checked)}
                                    className="rounded text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Add natural breathing pauses</span>
                            </label>
                        </div>
                    </section>

                    {/* Music */}
                    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <Music size={16} className="text-pink-500" /> Music Defaults
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Default Track</label>
                                <select
                                    value={music.track || ""}
                                    onChange={(e) => handleChange('music', 'track', e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                                >
                                    <option value="">(None)</option>
                                    {Array.isArray(tracks) && tracks.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Volume: {Math.round((music.volume || 0.2) * 100)}%</label>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={music.volume || 0.2}
                                    onChange={(e) => handleChange('music', 'volume', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={music.duck_voice || false}
                                    onChange={(e) => handleChange('music', 'duck_voice', e.target.checked)}
                                    className="rounded text-pink-600 focus:ring-pink-500"
                                />
                                <span className="text-sm text-gray-700">Auto-duck under voice</span>
                            </label>
                        </div>
                    </section>
                </div>

                {/* 4. MIXING */}
                <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                        <Sliders size={16} className="text-indigo-500" /> Audio Mixing
                    </h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Voice Gain</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range" min="0" max="2" step="0.1"
                                    value={mix.voice_gain || 1.0}
                                    onChange={(e) => handleChange('mix', 'voice_gain', parseFloat(e.target.value))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-mono font-bold w-12 text-center">{((mix.voice_gain || 1.0) * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Music Gain</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={mix.music_gain || 0.2}
                                    onChange={(e) => handleChange('mix', 'music_gain', parseFloat(e.target.value))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-mono font-bold w-12 text-center">{((mix.music_gain || 0.2) * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}

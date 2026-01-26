import React, { useState, useEffect } from 'react';
import { X, Save, Film, FileText, Type, Layout, Music, Mic, Image } from 'lucide-react';
import { API_URL } from '../config';

export default function GlobalSettingsModal({ onClose }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('video');

    useEffect(() => {
        fetch(`${API_URL}/settings`)
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                onClose();
            } else {
                alert("Failed to save settings");
            }
        } catch (e) {
            alert("Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (section, field, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    if (!settings && loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-white">Loading...</div>;
    if (!settings) return null;

    const tabs = [
        { id: 'video', label: 'Video Defaults', icon: Film },
        { id: 'script', label: 'Script AI', icon: FileText },
        { id: 'hook', label: 'Hook / Titles', icon: Type },
        { id: 'text_overlay', label: 'Text Overlay', icon: Layout },
        { id: 'music', label: 'Music Defaults', icon: Music },
        { id: 'voice', label: 'Voice Defaults', icon: Mic },
        { id: 'cover', label: 'Cover Defaults', icon: Image },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800">Global Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 bg-white">

                    {activeTab === 'video' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <InputFloat
                                    label="Default Duration (sec)"
                                    value={settings.video.default_duration_sec}
                                    onChange={v => handleChange('video', 'default_duration_sec', v)}
                                />
                                <div className="col-span-2 grid grid-cols-2 gap-6">
                                    <InputFloat
                                        label="Intro Silence (sec)"
                                        value={settings.video.intro_silence_sec}
                                        onChange={v => handleChange('video', 'intro_silence_sec', v)}
                                    />
                                    <InputFloat
                                        label="Outro Silence (sec)"
                                        value={settings.video.outro_silence_sec}
                                        onChange={v => handleChange('video', 'outro_silence_sec', v)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'script' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <InputText
                                label="Prompt Template"
                                subtitle="Use {{product_name}} as placeholder"
                                value={settings.script.prompt_template}
                                onChange={v => handleChange('script', 'prompt_template', v)}
                                multiline
                            />
                            <InputNumber
                                label="Target Word Count"
                                value={settings.script.target_word_count}
                                onChange={v => handleChange('script', 'target_word_count', v)}
                            />
                        </div>
                    )}

                    {activeTab === 'hook' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <InputText
                                label="Hook Prompt Template"
                                value={settings.hook.title_prompt_template}
                                onChange={v => handleChange('hook', 'title_prompt_template', v)}
                                multiline
                            />
                            <div className="grid grid-cols-2 gap-6">
                                <InputNumber
                                    label="Max Words"
                                    value={settings.hook.max_words}
                                    onChange={v => handleChange('hook', 'max_words', v)}
                                />
                                <InputNumber
                                    label="Max Characters"
                                    value={settings.hook.max_characters}
                                    onChange={v => handleChange('hook', 'max_characters', v)}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'text_overlay' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <InputNumber
                                    label="Title Max Chars"
                                    value={settings.text_overlay.title_max_characters}
                                    onChange={v => handleChange('text_overlay', 'title_max_characters', v)}
                                />
                                <InputNumber
                                    label="Subtitle Max Chars"
                                    value={settings.text_overlay.subtitle_max_characters}
                                    onChange={v => handleChange('text_overlay', 'subtitle_max_characters', v)}
                                />
                                <InputNumber
                                    label="Max Lines"
                                    value={settings.text_overlay.max_lines}
                                    onChange={v => handleChange('text_overlay', 'max_lines', v)}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'music' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <InputText
                                label="Default Music File"
                                subtitle="Filename (e.g. carefree.mp3) - must exist in assets/music/"
                                value={settings.music.default_music_file}
                                onChange={v => handleChange('music', 'default_music_file', v)}
                            />
                            <InputNumber
                                label="Default Volume (dB)"
                                value={settings.music.default_volume_db}
                                onChange={v => handleChange('music', 'default_volume_db', v)}
                            />
                        </div>
                    )}

                    {activeTab === 'voice' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <InputSelect
                                label="Default Voice Profile"
                                subtitle="Voice used for auto-generation"
                                value={settings.voice.default_voice_profile}
                                onChange={v => handleChange('voice', 'default_voice_profile', v)}
                                options={[
                                    { value: 'random', label: '🎲 Random (Pick Different Voice Each Time)' },
                                    { value: 'gm_puck', label: 'Gemini Puck (Energetic & Fast)' },
                                    { value: 'gm_charon', label: 'Gemini Charon (Deep & Narrative)' },
                                    { value: 'gm_zephyr', label: 'Gemini Zephyr (Neutral & Natural)' },
                                    { value: 'gm_aoede', label: 'Gemini Aoede (Clear & Professional)' },
                                    { value: 'gm_kore', label: 'Gemini Kore (Bright & Friendly)' },
                                    { value: 'gm_fenrir', label: 'Gemini Fenrir (Deep & Authoritative)' },
                                    { value: 'gm_sadaltager', label: 'Gemini Sadaltager (Smooth & Resonant)' }
                                ]}
                            />
                        </div>
                    )}

                    {activeTab === 'cover' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <InputText
                                    label="Default Text Color"
                                    subtitle="Hex Color (e.g. #FFFFFF)"
                                    value={settings.cover.default_color}
                                    onChange={v => handleChange('cover', 'default_color', v)}
                                />
                                <InputSelect
                                    label="Default Background Style"
                                    value={settings.cover.default_background}
                                    onChange={v => handleChange('cover', 'default_background', v)}
                                    options={[
                                        { value: 'none', label: 'None' },
                                        { value: 'box', label: 'Box' },
                                        { value: 'gradient', label: 'Fade / Gradient' }
                                    ]}
                                />
                                <InputSelect
                                    label="Default Position"
                                    value={settings.cover.default_position}
                                    onChange={v => handleChange('cover', 'default_position', v)}
                                    options={[
                                        { value: 'top', label: 'Top' },
                                        { value: 'center', label: 'Center' },
                                        { value: 'bottom', label: 'Bottom' }
                                    ]}
                                />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-600 font-bold text-sm bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black transition shadow-lg flex items-center gap-2 disabled:opacity-70"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                        {!saving && <Save size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function InputText({ label, subtitle, value, onChange, multiline }) {
    return (
        <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
            {multiline ? (
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800 min-h-[100px]"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
            ) : (
                <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                />
            )}
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
    );
}

function InputNumber({ label, value, onChange }) {
    return (
        <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
            <input
                type="number"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800"
                value={value}
                onChange={e => onChange(parseInt(e.target.value) || 0)}
            />
        </div>
    );
}

function InputFloat({ label, value, onChange }) {
    return (
        <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
            <input
                type="number"
                step="0.1"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800"
                value={value}
                onChange={e => onChange(parseFloat(e.target.value) || 0.0)}
            />
        </div>
    );
}

function InputSelect({ label, subtitle, value, onChange, options }) {
    return (
        <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
            <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800 bg-white"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
    );
}

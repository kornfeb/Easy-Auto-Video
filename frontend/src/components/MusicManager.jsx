import React, { useState, useEffect } from 'react';
import { Music, Volume2, RotateCcw, Sliders } from 'lucide-react';
import { API_URL } from '../config';

export default function MusicManager({ projectId, lastUpdated, projectData, onUpdate }) {
    const [musicFiles, setMusicFiles] = useState([]);
    const [selectedMusic, setSelectedMusic] = useState('carefree.mp3');
    const [enabled, setEnabled] = useState(true);
    const [volume, setVolume] = useState(-16);
    const [mixing, setMixing] = useState(false);

    useEffect(() => {
        // Fetch music files
        fetch(`${API_URL}/music/files`)
            .then(res => res.json())
            .then(data => setMusicFiles(data));

        // Load config from project data
        if (projectData && projectData.music_config) {
            setSelectedMusic(projectData.music_config.music_file || 'carefree.mp3');
            // If explicit enabled param exists use it, otherwise default to true
            if (projectData.music_config.enabled !== undefined) {
                setEnabled(projectData.music_config.enabled);
            } else {
                setEnabled(true);
            }
            setVolume(projectData.music_config.volume_adj || -16);
        } else {
            // Defaults for new projects
            setSelectedMusic('carefree.mp3');
            setEnabled(true);
            setVolume(-16);
        }
    }, [projectId, projectData]);

    const handleMix = async () => {
        setMixing(true);
        try {
            const payload = {
                music_file: selectedMusic,
                enabled: enabled,
                volume_adj: parseInt(volume)
            };
            const res = await fetch(`${API_URL}/projects/${projectId}/music/mix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                onUpdate();
            } else {
                const err = await res.json();
                alert(`Mixing failed: ${err.detail || 'Unknown error'}`);
            }
        } catch (e) {
            alert("Error mixing audio");
        } finally {
            setMixing(false);
        }
    };

    return (
        <div className="mb-12">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Music size={24} className="text-gray-500" /> Background Music
                </h2>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEnabled(!enabled)}>
                    <span className={`text-xs font-bold mr-2 ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <div
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Select Track</label>
                        <div className="relative">
                            <select
                                value={selectedMusic}
                                onChange={(e) => {
                                    setSelectedMusic(e.target.value);
                                    if (e.target.value !== 'none') setEnabled(true);
                                }}
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition appearance-none"
                            >
                                <option value="none">No Music (Voice Only)</option>
                                {musicFiles.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                            <Music size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        {musicFiles.length === 0 && (
                            <div className="mt-2 text-[10px] text-orange-500 font-medium">
                                * No music files found in assets/music/
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mixing Volume</label>
                            <span className="text-xs font-mono font-bold text-blue-600">{volume} dB</span>
                        </div>
                        <input
                            type="range"
                            min="-40"
                            max="-5"
                            step="1"
                            value={volume}
                            onChange={(e) => setVolume(e.target.value)}
                            disabled={!enabled}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1 uppercase">
                            <span>Quiet</span>
                            <span>Balanced</span>
                            <span>Loud</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-dashed border-gray-200 flex items-center justify-between">
                    <div className="flex-1 mr-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-gray-100 text-gray-600 rounded">
                                <Volume2 size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Final Mix Preview</span>
                        </div>
                        <audio
                            controls
                            className="w-full h-8"
                            src={`${API_URL}/media/${projectId}/output/final_audio_mix.wav?t=${new Date(projectData.last_updated).getTime()}`}
                        >
                            Your browser does not support the audio element.
                        </audio>
                    </div>

                    <button
                        onClick={handleMix}
                        disabled={mixing}
                        className="w-48 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-gray-200 transition-all active:scale-[0.98] z-20"
                    >
                        {mixing ? <RotateCcw size={18} className="animate-spin" /> : <Sliders size={18} />}
                        {mixing ? 'MIXING...' : 'APPLY MIX'}
                    </button>
                </div>
            </div>
        </div>
    );
}

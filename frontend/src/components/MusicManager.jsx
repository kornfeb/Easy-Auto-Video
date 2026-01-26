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

        // Fetch global settings for defaults
        fetch(`${API_URL}/settings`)
            .then(res => res.json())
            .then(globalSettings => {
                // Load config from project data
                if (projectData && projectData.music_config) {
                    setSelectedMusic(projectData.music_config.music_file || globalSettings.music.default_music_file);
                    if (projectData.music_config.enabled !== undefined) {
                        setEnabled(projectData.music_config.enabled);
                    } else {
                        setEnabled(true);
                    }
                    setVolume(projectData.music_config.volume_adj || globalSettings.music.default_volume_db);
                } else {
                    // Defaults from global settings for new projects
                    setSelectedMusic(globalSettings.music.default_music_file);
                    setEnabled(true);
                    setVolume(globalSettings.music.default_volume_db);
                }
            })
            .catch(() => {
                // Fallback if settings fetch fails
                if (projectData && projectData.music_config) {
                    setSelectedMusic(projectData.music_config.music_file || 'carefree.mp3');
                    setEnabled(projectData.music_config.enabled !== undefined ? projectData.music_config.enabled : true);
                    setVolume(projectData.music_config.volume_adj || -16);
                } else {
                    setSelectedMusic('carefree.mp3');
                    setEnabled(true);
                    setVolume(-16);
                }
            });
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
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                            <Music size={24} />
                        </div>
                        Background Music
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-11">Mix background music with your voiceover.</p>
                </div>

                <div className="flex items-center gap-2 cursor-pointer select-none bg-gray-50 p-1.5 rounded-full border border-gray-200" onClick={() => setEnabled(!enabled)}>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${!enabled ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}>
                        OFF
                    </span>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${enabled ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400'}`}>
                        ON
                    </span>
                </div>
            </div>

            <div className={`bg-white p-8 rounded-2xl border transition-all duration-300 ${enabled ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60 grayscale-[0.5]'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Track Selection */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                            <Music size={14} /> Select Track
                        </label>
                        <div className="relative group">
                            <select
                                value={selectedMusic}
                                onChange={(e) => {
                                    setSelectedMusic(e.target.value);
                                    if (e.target.value !== 'none') setEnabled(true);
                                }}
                                disabled={!enabled}
                                className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-800 focus:ring-2 focus:ring-pink-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer hover:border-gray-300 disabled:cursor-not-allowed"
                            >
                                <option value="none">No Music (Voice Only)</option>
                                {musicFiles.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white rounded-lg shadow-sm text-pink-500 group-hover:text-pink-600 transition-colors">
                                <Music size={16} />
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <Sliders size={16} />
                            </div>
                        </div>

                        {selectedMusic !== 'none' && (
                            <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full text-pink-500 shadow-sm"><Volume2 size={16} /></div>
                                <div>
                                    <div className="text-xs font-bold text-pink-900">Current Track</div>
                                    <div className="text-xs text-pink-700 truncate max-w-[200px]">{selectedMusic}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Volume Control */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mixing Volume</label>
                            <span className="text-sm font-mono font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-700">{volume} dB</span>
                        </div>
                        <div className="relative pt-6 pb-2">
                            <input
                                type="range"
                                min="-40"
                                max="-5"
                                step="1"
                                value={volume}
                                onChange={(e) => setVolume(e.target.value)}
                                disabled={!enabled}
                                className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-pink-600 disabled:accent-gray-400"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-wider">
                                <span>Quiet (-40dB)</span>
                                <span>Balanced (-20dB)</span>
                                <span>Loud (-5dB)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100 my-8"></div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 w-full bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Final Mix Preview</span>
                        </div>

                        <audio
                            controls
                            className="w-full h-10"
                            src={`${API_URL}/media/${projectId}/output/final_audio_mix.wav?t=${new Date(projectData.last_updated).getTime()}`}
                        >
                            Your browser does not support the audio element.
                        </audio>
                    </div>

                    <button
                        onClick={handleMix}
                        disabled={mixing || !enabled}
                        className="w-full md:w-auto h-14 px-8 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] uppercase tracking-wide text-sm"
                    >
                        {mixing ? <RotateCcw size={18} className="animate-spin" /> : <Sliders size={18} />}
                        {mixing ? 'PROCESSING MIX...' : 'APPLY AUDIO MIX'}
                    </button>
                </div>
            </div>
        </div>
    );
}

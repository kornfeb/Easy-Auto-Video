import React, { useState, useEffect } from 'react';
import { FileText, FileEdit, Save, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { API_URL } from '../../config';

export default function ScriptEditor({ projectId, lastUpdated, projectData, onUpdate }) {
    const [content, setContent] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchScript = () => {
        fetch(`${API_URL}/projects/${projectId}/script`)
            .then(res => res.json())
            .then(data => {
                setContent(data.content);
                setWordCount(data.word_count);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch script", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchScript();
    }, [projectId, lastUpdated]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                const data = await res.json();
                setWordCount(data.word_count);
                setIsEditing(false);
                onUpdate(); // Refresh project metadata
            } else {
                alert("Failed to save script");
            }
        } catch (err) {
            alert("Error saving script");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        // Removed validation as requested

        setGenerating(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step_name: 'script_gen' })
            });

            if (res.ok) {
                await fetchScript();
                onUpdate();
            } else {
                const err = await res.json();
                alert(`Generation failed: ${err.message || 'Unknown error'}`);
            }
        } catch (e) {
            alert("Error connecting to generator");
        } finally {
            setGenerating(false);
        }
    };

    const status = projectData.pipeline?.script_gen?.status || 'PENDING';

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <FileText size={28} className="text-blue-600" /> Video Script
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Review and edit the script that will be narrated by AI.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${status === 'MANUAL_EDIT' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                        {status === 'completed' ? 'Auto-Generated' : status === 'MANUAL_EDIT' ? 'Modified' : status}
                    </span>
                    <span className="text-sm text-gray-500 font-medium whitespace-nowrap bg-gray-100 px-3 py-1 rounded-full">{wordCount} words (~{Math.round(wordCount * 0.5)}s)</span>

                    {!isEditing ? (
                        <div className="flex gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? <RotateCcw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {generating ? 'Generating...' : 'Gen Script'}
                            </button>

                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm"
                            >
                                <FileEdit size={16} /> Edit
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                                className="px-4 py-2 text-gray-500 text-sm font-bold rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-md"
                            >
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`bg-white rounded-xl border-2 transition-all ${isEditing ? 'border-indigo-300 shadow-xl ring-4 ring-indigo-50/50' : 'border-gray-100 shadow-sm'}`}>
                {loading ? (
                    <div className="p-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                        <div className="animate-spin text-blue-500"><FileText size={24} /></div>
                        Loading script...
                    </div>
                ) : isEditing ? (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full p-8 text-lg font-medium text-gray-800 outline-none min-h-[400px] leading-relaxed resize-y rounded-xl"
                        placeholder="Write your video script here..."
                        autoFocus
                    />
                ) : (
                    <div className="p-8 text-lg font-medium text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[200px]">
                        {content || <span className="italic text-gray-400 text-base flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-100 rounded-lg">No script generated yet.<br /><span className="text-xs mt-2 text-gray-300">Run 'Gen Script' to generate automatically from images.</span></span>}
                    </div>
                )}
            </div>
            <p className="mt-3 text-xs text-gray-400 italic text-center">
                * Word count is estimated as Thai characters divided by 4. Target for 15s is ~30 words.
            </p>
        </div>
    );
}

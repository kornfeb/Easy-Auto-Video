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
                body: JSON.stringify({ step_name: '03_script_gen' })
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

    const status = projectData.pipeline?.['03_script_gen']?.status || 'PENDING';

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={24} /></div>
                        Video Script
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-12">
                        Review and edit the script that will be narrated by AI.
                    </p>
                </div>

                <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide border ${status === 'MANUAL_EDIT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                        {status === 'completed' ? 'Auto-Generated' : status === 'MANUAL_EDIT' ? 'Modified' : status}
                    </span>
                    <span className="text-xs text-gray-600 font-bold bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                        {wordCount} words <span className="text-gray-400 font-normal ml-1">(~{Math.round(wordCount * 0.5)}s)</span>
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Script Content</div>
                    {!isEditing ? (
                        <div className="flex gap-3">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="flex items-center gap-2 px-5 h-10 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? <RotateCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {generating ? 'Generating...' : 'Auto-Generate'}
                            </button>

                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-5 h-10 bg-white border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-gray-50 transition shadow-sm"
                            >
                                <FileEdit size={14} /> Edit Mode
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                                className="px-5 h-10 text-gray-500 text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 h-10 bg-green-600 text-white text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-green-700 transition shadow-md"
                            >
                                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                        <div className="animate-spin text-blue-500"><FileText size={32} /></div>
                        Loading script...
                    </div>
                ) : isEditing ? (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full p-8 text-lg font-medium text-gray-800 outline-none min-h-[500px] leading-relaxed resize-y bg-white focus:bg-blue-50/10 transition-colors"
                        placeholder="Write your video script here..."
                        autoFocus
                    />
                ) : (
                    <div className="p-8 text-lg font-medium text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[300px] bg-white">
                        {content || (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-center">
                                <div className="p-4 bg-gray-100 rounded-full mb-3 text-gray-300"><FileText size={32} /></div>
                                <span className="text-gray-500 font-bold text-sm">No script generated yet.</span>
                                <span className="text-gray-400 text-xs mt-1 max-w-xs">Use the "Auto-Generate" button to create a script from your product images.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <p className="text-xs text-center text-gray-400 font-medium">
                * Word count estimate: Thai characters / 4. Target duration ~15s (30-40 words).
            </p>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import ImageProcessor from './components/steps/ImageProcessor';
import TimelinePreview from './components/TimelinePreview';
import { API_URL } from './config';
import { Upload, Terminal, Beaker, CheckCircle2, AlertCircle, FileImage, Film, Save, RotateCcw, X, Trash2, Layout, Wand2, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export default function ImageEditorSandbox() {
    const projectId = "SANDBOX_TEST";
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [editedBlob, setEditedBlob] = useState(null);
    const [editedUrl, setEditedUrl] = useState(null);
    const [refreshTs, setRefreshTs] = useState(Date.now());
    const [status, setStatus] = useState({ type: 'info', message: 'Ready' });
    const [aiSmartCrop, setAiSmartCrop] = useState(false);

    const fetchAssets = () => {
        setRefreshTs(Date.now()); // Update timestamp on every fetch
        fetch(`${API_URL}/projects/${projectId}/assets`)
            .then(res => res.json())
            .then(data => {
                setAssets(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load assets", err);
                setLoading(false);
                setStatus({ type: 'error', message: "Backend unreachable." });
            });
    };

    const handleDelete = async (filename) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${filename}"?`)) return;
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/assets/${filename}`, { method: 'DELETE' });
            if (res.ok) {
                setStatus({ type: 'success', message: 'Asset Deleted' });
                if (selectedAsset?.name === filename) {
                    setSelectedAsset(null);
                    setEditedBlob(null);
                    setEditedUrl(null);
                }
                fetchAssets();
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'Delete Failed' });
        }
    };

    const handleRestore = async (filename) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/assets/${filename}/restore`, { method: 'POST' });
            if (res.ok) {
                setStatus({ type: 'success', message: 'Original Restored' });
                setRefreshTs(Date.now());
                fetchAssets();
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'Restore Failed' });
        }
    };

    const handleAutoLayout = async () => {
        if (!assets.length) return;
        setStatus({ type: 'info', message: aiSmartCrop ? 'AI Perception: Analyzing Subjects...' : 'Auto-Normalizing Assets...' });
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/images/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: [], // empty for all
                    process_all: true,
                    mode: 'normalize',
                    bg_color: '#000000',
                    ai_smart_crop: aiSmartCrop
                })
            });
            if (res.ok) {
                setStatus({ type: 'success', message: aiSmartCrop ? 'AI Perception: Subjects Traced & Cropped' : 'Normalization Complete (9:16)' });
                setRefreshTs(Date.now());
                fetchAssets();
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'Normalization Failed' });
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus({ type: 'info', message: `Uploading ${file.name}...` });
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/upload/image?ai_smart_crop=${aiSmartCrop}`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                setStatus({ type: 'success', message: `Loaded ${file.name}` });
                fetchAssets();
            } else {
                throw new Error("Upload Error");
            }
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-500/30">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
                        <Beaker size={24} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black tracking-tight uppercase">Image Editor Sandbox</h1>
                            <span className="bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Experimental</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono">/sandbox/image-editor • ISOLATED STORAGE</p>
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                    status.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                    <Terminal size={12} />
                    {status.message}
                </div>
            </header>

            <main className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-[1800px] mx-auto">

                {/* 1. Sidebar: Assets & Upload */}
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
                        <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            1. Source Media
                        </h3>

                        <label className="block group cursor-pointer">
                            <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center group-hover:bg-blue-500/5 group-hover:border-blue-500/50 transition-all">
                                <Upload size={20} className="mx-auto mb-2 text-gray-600 group-hover:text-blue-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-400">Upload Media</span>
                                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.webm" onChange={handleUpload} />
                            </div>
                        </label>

                        <div className="space-y-2 mt-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                            {assets.map(asset => (
                                <div
                                    key={asset.name}
                                    onClick={() => {
                                        setSelectedAsset(asset);
                                        setEditedBlob(null);
                                        setEditedUrl(null);
                                    }}
                                    className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAsset?.name === asset.name ? 'bg-blue-600/20 border-blue-500/50' : 'bg-gray-950/40 border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-black border border-gray-800 flex-none overflow-hidden flex items-center justify-center relative">
                                        {asset.name.toLowerCase().endsWith('.webm') || asset.name.toLowerCase().endsWith('.mp4') ? (
                                            <video src={`${API_URL}${asset.url}?t=${refreshTs}#t=0.5`} className="w-full h-full object-cover" muted />
                                        ) : (
                                            <img src={`${API_URL}${asset.url}?t=${refreshTs}`} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[10px] font-bold truncate ${selectedAsset?.name === asset.name ? 'text-blue-400' : 'text-gray-400'}`}>{asset.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[8px] text-gray-600 uppercase font-mono">{(asset.size / 1024).toFixed(0)} KB</p>
                                            {asset.has_backup && (
                                                <span className="text-[7px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/20 font-black flex items-center gap-1">
                                                    <RotateCcw size={8} /> EDITED
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-all duration-300">
                                        {asset.has_backup && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRestore(asset.name); }}
                                                className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors hover:scale-110 active:scale-90"
                                                title="Restore Original"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(asset.name); }}
                                            className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors hover:scale-110 active:scale-90"
                                            title="Delete Asset"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
                        <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            2. AI Perception
                        </h3>

                        <div className="space-y-4">
                            <div
                                onClick={() => setAiSmartCrop(!aiSmartCrop)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${aiSmartCrop ? 'bg-blue-600/10 border-blue-500/50 shelf-highlight' : 'bg-gray-950/40 border-gray-800'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${aiSmartCrop ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                        <Sparkles size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase text-white leading-none mb-1">AI Smart Crop</p>
                                        <p className="text-[8px] text-gray-500 font-medium">Trace subject vs center-fit</p>
                                    </div>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${aiSmartCrop ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${aiSmartCrop ? 'right-0.5' : 'left-0.5'}`}></div>
                                </div>
                            </div>

                            <button
                                onClick={handleAutoLayout}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 group"
                            >
                                <Zap size={16} className="group-hover:translate-y-[-1px] group-hover:translate-x-[1px] transition-transform" />
                                Normalize Project
                            </button>

                            <p className="text-[9px] text-gray-500 font-medium leading-relaxed">
                                {aiSmartCrop ?
                                    "AI will analyze each frame to find faces or products before cropping." :
                                    "Standard 9:16 rules: Scale-to-fit with black padding (Letterbox)."}
                            </p>
                        </div>
                    </section>
                </div>

                {/* 2. Main Editor Area */}
                <div className="lg:col-span-3 space-y-6">
                    <section className="bg-white rounded-[2rem] shadow-2xl overflow-hidden h-[850px] relative border-4 border-gray-900">
                        <div className="absolute top-6 left-6 z-10">
                            <div className="flex bg-gray-900/90 backdrop-blur-xl border border-gray-800 px-4 py-2 rounded-full items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
                                <span className="text-[10px] font-black text-gray-200 uppercase tracking-widest leading-none">
                                    Live Buffer: {selectedAsset?.name || 'Waiting...'}
                                </span>
                            </div>
                        </div>

                        {editedUrl ? (
                            <div className="h-full flex flex-col bg-gray-950 p-8 pt-20 items-center justify-start text-center animate-in fade-in zoom-in duration-500 relative overflow-y-auto">
                                <div className="absolute top-10 left-10 flex items-center gap-2 text-blue-400 font-black uppercase text-[10px] tracking-widest">
                                    <CheckCircle2 size={16} /> Step 3: Final Review
                                </div>

                                <div className="max-w-2xl w-full flex flex-col gap-8">
                                    {/* 1. Action Buttons (Now at the top) */}
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => { setEditedBlob(null); setEditedUrl(null); }}
                                            className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white transition-all border border-white/5 active:scale-95"
                                        >
                                            <X size={14} className="inline mr-2" /> Discard
                                        </button>
                                        {selectedAsset?.has_backup && (
                                            <button
                                                onClick={() => handleRestore(selectedAsset.name)}
                                                className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-amber-600/10 text-amber-400 hover:bg-amber-600/20 transition-all border border-amber-500/20 active:scale-95"
                                            >
                                                <RotateCcw size={14} className="inline mr-2" /> Restore
                                            </button>
                                        )}
                                        <button
                                            onClick={async () => {
                                                setStatus({ type: 'info', message: 'Writing to Disk...' });
                                                const formData = new FormData();
                                                formData.append('file', editedBlob, selectedAsset.name);
                                                try {
                                                    const res = await fetch(`${API_URL}/projects/${projectId}/upload/image`, {
                                                        method: 'POST',
                                                        body: formData
                                                    });
                                                    if (res.ok) {
                                                        setStatus({ type: 'success', message: 'Storage Updated Successfully' });
                                                        setEditedBlob(null);
                                                        setEditedUrl(null);
                                                        setSelectedAsset(null); // Exit Editor Mode
                                                        fetchAssets();
                                                    }
                                                } catch (e) {
                                                    setStatus({ type: 'error', message: 'Disk Write Error' });
                                                }
                                            }}
                                            className="flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Save size={16} /> Commit to Storage
                                        </button>
                                    </div>

                                    {/* 2. Image Preview (Now below buttons) */}
                                    <div className="relative group mx-auto w-full">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                        <div className="relative rounded-[2.2rem] overflow-hidden border-4 border-white/10 shadow-3xl bg-black max-h-[500px]">
                                            <img src={editedUrl} className="w-full h-auto object-contain max-h-[500px]" alt="Preview" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : selectedAsset ? (
                            <ImageProcessor
                                key={selectedAsset.name} // Force fresh mount on change
                                projectId={projectId}
                                assets={assets}
                                initialSelection={[selectedAsset.name]}
                                onUpdate={fetchAssets}
                                onClose={() => setSelectedAsset(null)}
                                onCropDone={(blob) => {
                                    if (!blob) {
                                        setStatus({ type: 'error', message: 'Failed to capture frame.' });
                                        return;
                                    }
                                    setEditedBlob(blob);
                                    setEditedUrl(URL.createObjectURL(blob));
                                    setStatus({ type: 'success', message: 'Crop Captured' });
                                }}
                            />
                        ) : (
                            <TimelinePreview
                                projectId={projectId}
                                refreshTs={refreshTs}
                                onEditAsset={(name) => {
                                    const asset = assets.find(a => a.name === name);
                                    if (asset) setSelectedAsset(asset);
                                }}
                            />
                        )}
                    </section>

                    {/* Info Footer */}
                    <footer className="flex items-center justify-between px-8 py-5 rounded-2xl bg-gray-900/40 border border-gray-800">
                        <div className="flex items-center gap-4">
                            <CheckCircle2 size={20} className="text-blue-500/50" />
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Isolated Flow</h4>
                                <p className="text-[9px] text-gray-600">Original remains unchanged until Commit is pressed.</p>
                            </div>
                        </div>
                        <div className="text-[9px] font-mono text-gray-700 bg-gray-950 px-3 py-1.5 rounded border border-gray-800">
                            PATH: /projects/SANDBOX_TEST/input/{selectedAsset?.name || 'none'}
                        </div>
                    </footer>
                </div>

            </main >
        </div >
    );
}

import React, { useState, useEffect } from 'react';
import ImageProcessor from './components/steps/ImageProcessor';
import { API_URL } from './config';
import { Upload, Terminal, Beaker, CheckCircle2, AlertCircle, FileImage, Film, Save, RotateCcw, X } from 'lucide-react';

export default function ImageEditorSandbox() {
    const projectId = "SANDBOX_TEST";
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [editedBlob, setEditedBlob] = useState(null);
    const [editedUrl, setEditedUrl] = useState(null);
    const [refreshTs, setRefreshTs] = useState(Date.now());
    const [status, setStatus] = useState({ type: 'info', message: 'Ready' });

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

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus({ type: 'info', message: `Uploading ${file.name}...` });
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/upload/image`, {
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
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAsset?.name === asset.name ? 'bg-blue-600/20 border-blue-500/50' : 'bg-gray-950/40 border-gray-800 hover:border-gray-700'
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
                                        <p className="text-[8px] text-gray-600 uppercase font-mono mt-0.5">{(asset.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Pending Edits Result */}
                    {editedUrl && (
                        <section className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl space-y-4 animate-in slide-in-from-left duration-300">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <RotateCcw size={12} /> Unsaved Edit
                                </h4>
                                <button onClick={() => { setEditedBlob(null); setEditedUrl(null); }} className="text-gray-600 hover:text-white">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-blue-500/30 shadow-2xl shadow-blue-500/10">
                                <img src={editedUrl} className="w-full h-full object-cover" />
                            </div>
                            <button
                                onClick={async () => {
                                    setStatus({ type: 'info', message: 'Finalizing Save...' });
                                    const formData = new FormData();
                                    formData.append('file', editedBlob, selectedAsset.name);
                                    try {
                                        const res = await fetch(`${API_URL}/projects/${projectId}/upload/image`, {
                                            method: 'POST',
                                            body: formData
                                        });
                                        if (res.ok) {
                                            setStatus({ type: 'success', message: 'Committed to Storage' });
                                            setEditedBlob(null);
                                            setEditedUrl(null);
                                            fetchAssets();
                                        }
                                    } catch (e) {
                                        setStatus({ type: 'error', message: 'Save Failed' });
                                    }
                                }}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                            >
                                <Save size={14} /> Commit to Storage
                            </button>
                        </section>
                    )}
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

                        {selectedAsset ? (
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
                            <div className="h-full bg-gray-950 flex flex-col items-center justify-center text-gray-800">
                                <Beaker size={80} className="mb-6 opacity-20" />
                                <p className="font-black text-2xl uppercase tracking-[0.3em] opacity-20">Sandbox Core Offline</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-20 mt-4">Select Target Asset to Boot</p>
                            </div>
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

            </main>
        </div>
    );
}

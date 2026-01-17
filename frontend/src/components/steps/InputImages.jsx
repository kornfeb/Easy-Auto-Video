import React, { useState, useEffect, useRef } from 'react';
import { Download, Image as ImageIcon, Type, Layout, Palette, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, Mic, RefreshCw } from 'lucide-react';
import { API_URL } from '../../config';

function UrlImageDownloader({ projectId, onComplete }) {
    const [urlList, setUrlList] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [results, setResults] = useState(null);

    const handleDownload = async () => {
        const urls = urlList.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length === 0) return;

        setDownloading(true);
        setResults(null);

        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/upload/urls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls })
            });
            const data = await res.json();
            setResults(data.results);
            if (data.success_count > 0) {
                onComplete();
            }
        } catch (err) {
            alert("Error during download process");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3 uppercase tracking-wide">
                <Download size={16} className="text-blue-500" /> Import via URL
            </h3>
            <p className="text-xs text-gray-500 mb-4">Paste direct image URLs (JPG, PNG, WEBP), one per line.</p>

            <div className="flex gap-4">
                <textarea
                    value={urlList}
                    onChange={(e) => setUrlList(e.target.value)}
                    placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
                    className="flex-1 h-32 p-3 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50"
                    disabled={downloading}
                />
                <div className="w-48 flex flex-col justify-end">
                    <button
                        onClick={handleDownload}
                        disabled={downloading || !urlList.trim()}
                        className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                    >
                        {downloading ? 'Downloading...' : 'Start Download'}
                    </button>
                </div>
            </div>

            {results && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <h4 className="text-xs font-bold mb-2 text-gray-400 uppercase">Input Log</h4>
                    <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {results.map((r, i) => (
                            <li key={i} className="text-[10px] flex items-center gap-2 font-mono">
                                {r.success ? (
                                    <span className="text-green-600 font-bold">SUCCESS</span>
                                ) : (
                                    <span className="text-red-500 font-bold">FAILED</span>
                                )}
                                <span className="text-gray-400 truncate flex-1" title={r.url}>{r.url}</span>
                                {r.filename && <span className="text-gray-600 bg-gray-200 px-1 rounded">{r.filename}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default function InputImages({ projectId, lastUpdated, projectData, onUpdate }) {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAssets = () => {
        fetch(`${API_URL}/projects/${projectId}/assets`)
            .then(res => res.json())
            .then(data => {
                setAssets(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load assets", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAssets();
    }, [projectId, lastUpdated]);

    const handleRefresh = () => {
        fetchAssets();
        onUpdate();
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <ImageIcon size={28} className="text-blue-600" /> Input Gallery
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage image assets for your video.</p>
                </div>
                <div className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                    {assets.length} Assets Available
                </div>
            </div>

            <UrlImageDownloader projectId={projectId} onComplete={handleRefresh} />

            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <ImageIcon size={16} className="text-gray-400" /> Gallery View
                </h3>

                {loading ? (
                    <div className="py-20 text-center text-gray-400 flex flex-col items-center">
                        <div className="animate-pulse w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                        Loading gallery...
                    </div>
                ) : assets.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <ImageIcon size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">No images found in project input.</p>
                        <p className="text-xs text-gray-400 mt-2">Use the downloader above or manually drop files into <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-600">/projects/{projectId}/input</code></p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {assets.map((asset) => (
                            <div key={asset.name} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]">
                                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                                    <img
                                        src={`${API_URL}${asset.url}`}
                                        alt={asset.name}
                                        className="object-cover w-full h-full"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                                <div className="p-2 border-t border-gray-100 bg-white relative">
                                    <div className="text-[10px] font-medium text-gray-700 truncate" title={asset.name}>
                                        {asset.name}
                                    </div>
                                    <div className="text-[9px] text-gray-400 mt-0.5 uppercase">
                                        {asset.size ? (asset.size / 1024).toFixed(0) + 'KB' : 'Unknown'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- Video Cover System --- */}
            <div className="mt-12 pt-8 border-t border-gray-200">
                <VideoCoverManager projectId={projectId} projectData={projectData} assets={assets} onUpdate={onUpdate} />
            </div>
        </div>
    );
}

function VideoCoverManager({ projectId, projectData, assets, onUpdate }) {
    const [activeTab, setActiveTab] = useState('image'); // 'image' | 'text'
    const [coverMode, setCoverMode] = useState('existing');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isIntro, setIsIntro] = useState(true);
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [fetchingScript, setFetchingScript] = useState(false);

    // Text Overlay State
    const [overlay, setOverlay] = useState({
        title: '',
        subtitle: '',
        position: 'bottom', // top, center, bottom
        color: '#FFFFFF',
        background: 'none', // none, box, gradient
        font: 'Thai_Default',
        weight: 'regular'
    });

    const overlayDebounceRef = useRef(null);

    // Init state from projectData
    useEffect(() => {
        if (projectData?.cover) {
            // Update preview URL with timestamp to force refresh
            if (projectData.cover.file_path) {
                setPreviewUrl(`${API_URL}/media/${projectId}/${projectData.cover.file_path}?t=${new Date().getTime()}`);
            }
            // Default to true if undefined
            setIsIntro(projectData.cover.use_as_intro !== undefined ? projectData.cover.use_as_intro : true);

            if (projectData.cover.source === 'existing' && projectData.cover.image_id) {
                setSelectedAssetId(projectData.cover.image_id);
            }

            // Init Overlay
            if (projectData.cover.text_overlay) {
                setOverlay(prev => ({ ...prev, ...projectData.cover.text_overlay }));
            }
        }
    }, [projectData, projectId]);

    // Handle Image Selection
    const handleSetCover = async (source, imageId = null, url = null) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/cover/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source,
                    image_id: imageId,
                    url: url ? url : null,
                    use_as_intro: isIntro
                })
            });
            if (!res.ok) throw new Error("Failed to set cover");
            const data = await res.json();
            setPreviewUrl(`${API_URL}${data.cover_url}`);
            if (imageId) setSelectedAssetId(imageId);
            onUpdate();
        } catch (err) {
            alert(err.message);
        }
    };

    // Handle Text Changes (Debounced)
    const handleOverlayChange = (key, value) => {
        const newOverlay = { ...overlay, [key]: value };
        setOverlay(newOverlay);

        if (overlayDebounceRef.current) clearTimeout(overlayDebounceRef.current);

        overlayDebounceRef.current = setTimeout(() => {
            submitOverlay(newOverlay);
        }, 600); // 600ms debounce
    };

    const submitOverlay = async (config) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/cover/render-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (!res.ok) throw new Error("Render Failed");
            const data = await res.json();
            setPreviewUrl(`${API_URL}${data.cover_url}`);
            // Do NOT call onUpdate() here to avoid full page re-render flicker, 
            // just local preview update is enough.
        } catch (err) {
            console.error(err);
        }
    };

    const handleAutoScript = async () => {
        setFetchingScript(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/script`);
            const data = await res.json();
            if (data.content) {
                // Simple logic: First non-empty line
                const lines = data.content.split('\n').map(l => l.trim()).filter(l => l);
                if (lines.length > 0) {
                    const title = lines[0].substring(0, 40); // Max 40
                    handleOverlayChange('title', title);
                }
            }
        } catch (e) { alert("Failed to fetch script"); }
        setFetchingScript(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('use_as_intro', isIntro);

        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/cover/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            setPreviewUrl(`${API_URL}${data.cover_url}`);
            setCoverMode('upload');
            setSelectedAssetId(null);
            onUpdate();
        } catch (err) {
            alert("Upload failed");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ImageIcon size={24} className="text-indigo-600" /> Video Cover & Intro
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Select a thumbnail and optional intro frame.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${activeTab === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            <ImageIcon size={14} /> Source
                        </button>
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${activeTab === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            <Type size={14} /> Text Overlay
                        </button>
                    </div>

                    {/* Intro Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                        <input
                            type="checkbox"
                            checked={isIntro}
                            onChange={async (e) => {
                                const val = e.target.checked;
                                setIsIntro(val);
                                // Call separate endpoint just to update options
                                try {
                                    await fetch(`${API_URL}/projects/${projectId}/cover/options`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ use_as_intro: val })
                                    });
                                } catch (e) {
                                    console.error("Failed to update intro option", e);
                                }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-700">Use as Intro</span>
                    </label>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">

                {/* Left: Controls */}
                <div className="flex-1">

                    {/* TAB: IMAGE SOURCE */}
                    {activeTab === 'image' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex gap-2 bg-gray-50 p-1 rounded-lg inline-flex mb-4">
                                <button onClick={() => setCoverMode('existing')} className={`px-4 py-2 rounded-md text-xs font-bold transition ${coverMode === 'existing' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>Existing Image</button>
                                <button onClick={() => setCoverMode('upload')} className={`px-4 py-2 rounded-md text-xs font-bold transition ${coverMode === 'upload' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>Upload One</button>
                                <button onClick={() => setCoverMode('ai')} className={`px-4 py-2 rounded-md text-xs font-bold transition ${coverMode === 'ai' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm' : 'text-gray-400'}`}>✨ AI Generate</button>
                            </div>

                            {coverMode === 'existing' && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {assets.map(asset => {
                                            const isSelected = selectedAssetId === asset.name;
                                            return (
                                                <div
                                                    key={asset.name}
                                                    onClick={() => handleSetCover('existing', asset.name)}
                                                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all group aspect-square ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent hover:border-gray-300'}`}
                                                >
                                                    <img src={`${API_URL}${asset.url}`} className="w-full h-full object-cover" loading="lazy" />
                                                    {isSelected && <div className="absolute inset-0 bg-indigo-900/20 flex items-center justify-center"><div className="bg-indigo-600 text-white p-1 rounded-full"><ImageIcon size={16} /></div></div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {coverMode === 'upload' && (
                                <div className="bg-gray-50 rounded-xl p-12 border-2 border-dashed border-gray-300 text-center">
                                    <input type="file" id="cover-upload" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    <label htmlFor="cover-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-500"><Download size={24} /></div>
                                        <span className="text-sm font-bold text-gray-700">Click to Upload Cover</span>
                                    </label>
                                </div>
                            )}

                            {coverMode === 'ai' && (
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-700 mb-2">Generate AI Cover</h4>
                                    <p className="text-xs text-gray-500 mb-4">Create a unique cover image using AI (DALL-E 3).</p>

                                    <div className="flex justify-end mb-2">
                                        <button
                                            onClick={async () => {
                                                const btn = document.getElementById('btn-magic-prompt');
                                                const originalText = btn.innerHTML;
                                                btn.innerHTML = `<span class="animate-spin">🔄</span> Thinking...`;
                                                btn.disabled = true;

                                                try {
                                                    const prodName = projectData?.product_name || "Product";
                                                    // Pick first image as reference if available
                                                    let refImage = null;
                                                    if (assets && assets.length > 0) {
                                                        refImage = assets[0].name;
                                                    }

                                                    const res = await fetch(`${API_URL}/projects/${projectId}/cover/gen-prompt`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ product_name: prodName, image_filename: refImage })
                                                    });
                                                    const data = await res.json();
                                                    if (data.error) throw new Error(data.error);

                                                    // Update textarea
                                                    const textArea = document.getElementById('ai-cover-prompt');
                                                    textArea.value = data.prompt;

                                                } catch (e) {
                                                    alert("Prompt generation failed: " + e.message);
                                                } finally {
                                                    btn.innerHTML = originalText;
                                                    btn.disabled = false;
                                                }
                                            }}
                                            id="btn-magic-prompt"
                                            className="text-[10px] bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-bold hover:bg-indigo-200 flex items-center gap-1 transition"
                                        >
                                            <span role="img" aria-label="magic">✨</span> Auto-Write Prompt with AI
                                        </button>
                                    </div>

                                    <textarea
                                        className="w-full p-3 text-xs border rounded-lg mb-4 h-24 resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="Describe your cover image... (e.g. Professional studio shot of a red silk scarf, luxury style, minimal background)"
                                        id="ai-cover-prompt"
                                    ></textarea>

                                    <button
                                        onClick={async () => {
                                            const prompt = document.getElementById('ai-cover-prompt').value;
                                            if (!prompt) return alert("Please enter a prompt");

                                            // Loading state UI...
                                            const btn = document.getElementById('btn-gen-cover');
                                            const originalText = btn.innerText;
                                            btn.innerText = "Generating...";
                                            btn.disabled = true;

                                            try {
                                                const res = await fetch(`${API_URL}/projects/${projectId}/cover/gen-image`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ prompt })
                                                });
                                                const data = await res.json();
                                                if (data.error) throw new Error(data.error);

                                                // Refresh to show in existing or just set preview
                                                setPreviewUrl(`${API_URL}${data.url}`);
                                                // Ideally we should select it as 'existing' now, but for now just show preview and let user select from global assets if needed, 
                                                // OR set it as cover immediately:
                                                await handleSetCover('existing', data.filename);
                                                // Switch mode to existing to show it selected? or stay here. Stay here is fine.

                                            } catch (e) {
                                                alert("Generation failed: " + e.message);
                                            } finally {
                                                btn.innerText = originalText;
                                                btn.disabled = false;
                                                onUpdate(); // Refresh asset list
                                            }
                                        }}
                                        id="btn-gen-cover"
                                        className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition"
                                    >
                                        Generate Image
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: TEXT OVERLAY */}
                    {activeTab === 'text' && (
                        <div className="space-y-6 animate-fadeIn bg-gray-50 p-6 rounded-xl border border-gray-200">
                            {/* Content */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Short Title (Hook)</label>
                                        <button
                                            onClick={async () => {
                                                setFetchingScript(true);
                                                try {
                                                    // Use newly available product name from project data or just ask user?
                                                    // We'll use a generic fallback or read from script step if possible.
                                                    // For now, let's try to get product info from elsewhere or passed in props.
                                                    // Assuming projectData has it, or we infer.
                                                    const prodName = projectData?.product_name || "Product";

                                                    const res = await fetch(`${API_URL}/projects/${projectId}/cover/gen-text`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ product_name: prodName, tone: "engaging" })
                                                    });
                                                    const data = await res.json();
                                                    if (data.options && data.options.length > 0) {
                                                        // Pick first or random? Let's pick first.
                                                        const opt = data.options[0];
                                                        handleOverlayChange('title', opt.title);
                                                        handleOverlayChange('subtitle', opt.subtitle);
                                                    }
                                                } catch (e) { alert("Failed to generate hook"); }
                                                setFetchingScript(false);
                                            }}
                                            className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold hover:bg-purple-200 flex items-center gap-1"
                                            disabled={fetchingScript}
                                        >
                                            {fetchingScript ? <RefreshCw size={8} className="animate-spin" /> : <Mic size={8} />}
                                            {fetchingScript ? 'Generating...' : 'Stop & Generate Hook'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={40}
                                        value={overlay.title}
                                        onChange={(e) => handleOverlayChange('title', e.target.value)}
                                        className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                        placeholder="E.g. Premium Silk Scarf"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tagline (Optional)</label>
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={overlay.subtitle}
                                        onChange={(e) => handleOverlayChange('subtitle', e.target.value)}
                                        className="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="E.g. Soft. Elegant. Timeless."
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-6">
                                {/* Styles */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Palette size={10} /> Text Color</label>
                                    <div className="flex gap-2">
                                        {['#FFFFFF', '#000000', '#FCD34D', '#EF4444', '#3B82F6'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => handleOverlayChange('color', c)}
                                                className={`w-6 h-6 rounded-full border shadow-sm transition-transform ${overlay.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-300' : ''}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Layout size={10} /> Background</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'none', label: 'None' },
                                            { id: 'box', label: 'Box' },
                                            { id: 'gradient', label: 'Fade' }
                                        ].map(bg => (
                                            <button
                                                key={bg.id}
                                                onClick={() => handleOverlayChange('background', bg.id)}
                                                className={`px-3 py-1 text-[10px] font-bold rounded border ${overlay.background === bg.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300'}`}
                                            >
                                                {bg.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Position */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Position</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOverlayChange('position', 'top')}
                                        className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${overlay.position === 'top' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <AlignVerticalJustifyStart size={16} /> <span className="text-xs font-bold">Top</span>
                                    </button>
                                    <button
                                        onClick={() => handleOverlayChange('position', 'center')}
                                        className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${overlay.position === 'center' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <AlignVerticalJustifyCenter size={16} /> <span className="text-xs font-bold">Center</span>
                                    </button>
                                    <button
                                        onClick={() => handleOverlayChange('position', 'bottom')}
                                        className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 ${overlay.position === 'bottom' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <AlignVerticalJustifyEnd size={16} /> <span className="text-xs font-bold">Bottom</span>
                                    </button>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="pt-4 border-t border-gray-200">
                                <button
                                    onClick={async () => {
                                        const btn = document.getElementById('btn-save-timeline');
                                        const originalText = btn.innerText;
                                        btn.innerText = "Applying...";
                                        btn.disabled = true;

                                        try {
                                            // 1. Save Text Overlay first (ensure current state is committed)
                                            await submitOverlay(overlay);

                                            // 2. Regenerate Timeline
                                            const res = await fetch(`${API_URL}/projects/${projectId}/timeline/generate`, {
                                                method: 'POST'
                                            });
                                            if (!res.ok) throw new Error("Timeline generation failed");

                                            alert("✅ Cover saved and Timeline updated!");
                                        } catch (e) {
                                            alert("❌ Failed: " + e.message);
                                        } finally {
                                            btn.innerText = originalText;
                                            btn.disabled = false;
                                        }
                                    }}
                                    id="btn-save-timeline"
                                    className="w-full py-3 bg-green-600 text-white rounded-lg font-bold shadow-sm hover:bg-green-700 transition flex items-center justify-center gap-2"
                                >
                                    <span role="img" aria-label="save">💾</span> Save Picture & Go to Regenerate Timeline
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Preview */}
                <div className="w-full md:w-[280px] flex-none">
                    <div className="bg-gray-900 rounded-xl p-3 shadow-lg border border-gray-800 sticky top-4">
                        <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">Cover Preview</h4>
                        <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden relative group">
                            {previewUrl ? (
                                <img src={previewUrl} className="w-full h-full object-cover" key={previewUrl} />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                                    <ImageIcon size={48} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-mono opacity-40">NO COVER SELECTED</span>
                                </div>
                            )}

                            {/* Overlay Info */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-end">
                                <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded font-mono">
                                    {isIntro ? "INTRO: 1.5s" : "THUMBNAIL"}
                                </span>
                                {overlay.title && (
                                    <span className="text-[9px] text-gray-400 font-mono">TEXT ON</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

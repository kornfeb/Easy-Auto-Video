import React, { useState, useEffect, useRef } from 'react';
import { Download, Image as ImageIcon, Type, Layout, Palette, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, Mic, RefreshCw, Crop } from 'lucide-react';
import { API_URL } from '../../config';
import ImageProcessor from './ImageProcessor';

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
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-12">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Download size={20} />
                </div>
                Import via URL
            </h3>
            <p className="text-sm text-gray-500 mb-6 ml-11">Paste direct image URLs (JPG, PNG, WEBP), one per line.</p>

            <div className="flex flex-col md:flex-row gap-6">
                <textarea
                    value={urlList}
                    onChange={(e) => setUrlList(e.target.value)}
                    placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
                    className="flex-1 h-32 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-50 text-gray-800 leading-relaxed"
                    disabled={downloading}
                />
                <div className="md:w-56 flex flex-col justify-end">
                    <button
                        onClick={handleDownload}
                        disabled={downloading || !urlList.trim()}
                        className="w-full h-12 bg-gray-900 text-white rounded-lg hover:bg-black transition-all disabled:opacity-50 font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    >
                        {downloading ? 'Downloading...' : 'Start Download'}
                    </button>
                </div>
            </div>

            {results && (
                <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-xs font-bold mb-3 text-gray-400 uppercase tracking-wider">Download Log</h4>
                    <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {results.map((r, i) => (
                            <li key={i} className="text-xs flex items-center gap-3 font-mono border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                {r.success ? (
                                    <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">OK</span>
                                ) : (
                                    <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">FAIL</span>
                                )}
                                <span className="text-gray-600 truncate flex-1" title={r.url}>{r.url}</span>
                                {r.filename && <span className="text-gray-500 text-[10px]">{r.filename}</span>}
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
    const [showProcessor, setShowProcessor] = useState(false);
    const [editingImage, setEditingImage] = useState(null); // Filename

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
        <div className="max-w-6xl mx-auto space-y-16">
            <div className="flex justify-between items-end border-b border-gray-100 pb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <ImageIcon size={32} />
                        </div>
                        Input Gallery
                    </h2>
                    <p className="text-base text-gray-500 mt-2 ml-14">Manage and prepare image assets for your video generation.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowProcessor(true)}
                        className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-black transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5"
                    >
                        <Crop size={16} /> Magic Resize Tool
                    </button>
                    <div className="px-5 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-extrabold uppercase tracking-wide border border-blue-100 shadow-sm">
                        {assets.length} Assets Available
                    </div>
                </div>
            </div>

            {/* URL Downloader Section */}
            <UrlImageDownloader projectId={projectId} onComplete={handleRefresh} />

            {/* Gallery Section */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <ImageIcon size={24} className="text-gray-400" />
                    Gallery View
                </h3>

                {loading ? (
                    <div className="py-24 text-center text-gray-400 flex flex-col items-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                        <span className="text-sm font-medium">Loading gallery...</span>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <ImageIcon size={40} />
                        </div>
                        <p className="text-gray-600 font-bold text-lg">No images found</p>
                        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Use the downloader above or drag and drop files directly into your project's input folder.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {assets.map((asset) => (
                            <div key={asset.name} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div
                                    className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative cursor-pointer"
                                    onClick={() => {
                                        setEditingImage(asset.name);
                                        setShowProcessor(true);
                                    }}
                                >
                                    <img
                                        src={`${API_URL}${asset.url}`}
                                        alt={asset.name}
                                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 bg-white/90 p-2 rounded-full transform scale-50 group-hover:scale-100 transition-all duration-200 shadow-sm backdrop-blur-sm">
                                            <Crop size={16} className="text-gray-800" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 border-t border-gray-100 bg-white">
                                    <div className="text-xs font-bold text-gray-700 truncate" title={asset.name}>
                                        {asset.name}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-medium tracking-wide">
                                        {asset.size ? (asset.size / 1024).toFixed(0) + 'KB' : 'Unknown'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Processor Modal */}
            {showProcessor && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="w-full max-w-6xl max-h-full">
                        <ImageProcessor
                            projectId={projectId}
                            assets={assets}
                            initialSelection={editingImage ? [editingImage] : []}
                            onUpdate={handleRefresh}
                            onClose={() => {
                                setShowProcessor(false);
                                setEditingImage(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Video Cover System */}
            <div className="pt-12 border-t border-gray-200">
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
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><ImageIcon size={20} /></div>
                        Video Cover & Intro
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 ml-9">Design your video thumbnail and intro sequence.</p>
                </div>

                <div className="flex items-center gap-6">
                    {/* Intro Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors group select-none">
                        <input
                            type="checkbox"
                            checked={isIntro}
                            onChange={async (e) => {
                                const val = e.target.checked;
                                setIsIntro(val);
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
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 group-hover:border-indigo-400 transition-all"
                        />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">Use as Intro (1.5s)</span>
                    </label>

                    {/* Tabs */}
                    <div className="flex bg-gray-100 p-1.5 rounded-xl">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'image' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <ImageIcon size={14} /> Source Image
                        </button>
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'text' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Type size={14} /> Text Overlay
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-10">

                {/* Left: Controls */}
                <div className="flex-1 min-w-0">

                    {/* TAB: IMAGE SOURCE */}
                    {activeTab === 'image' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Source Type Selector */}
                            <div className="flex gap-4 border-b border-gray-100 pb-2">
                                <button onClick={() => setCoverMode('existing')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${coverMode === 'existing' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    Existing Assets
                                </button>
                                <button onClick={() => setCoverMode('upload')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${coverMode === 'upload' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    Upload New
                                </button>
                                <button onClick={() => setCoverMode('ai')} className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-1 ${coverMode === 'ai' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    <span className="text-xs">✨</span> AI Generate
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm min-h-[400px]">
                                {coverMode === 'existing' && (
                                    assets.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                                            {assets.map(asset => {
                                                const isSelected = selectedAssetId === asset.name;
                                                return (
                                                    <div
                                                        key={asset.name}
                                                        onClick={() => handleSetCover('existing', asset.name)}
                                                        className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group aspect-square ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-md transform scale-[1.02]' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'}`}
                                                    >
                                                        <img src={`${API_URL}${asset.url}`} className="w-full h-full object-cover" loading="lazy" />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center backdrop-blur-[1px]">
                                                                <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg"><ImageIcon size={20} /></div>
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-[10px] text-white truncate">{asset.name}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                                            <ImageIcon size={48} className="mb-4 opacity-20" />
                                            <p>No assets found</p>
                                        </div>
                                    )
                                )}

                                {coverMode === 'upload' && (
                                    <div className="h-full flex flex-col justify-center">
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center hover:bg-gray-50 hover:border-gray-300 transition-colors relative">
                                            <input type="file" id="cover-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleFileUpload} />
                                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                <Download size={32} />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800">Click or Drag to Upload</h4>
                                            <p className="text-sm text-gray-400 mt-2">Supports JPG, PNG, WEBP (Max 10MB)</p>
                                        </div>
                                    </div>
                                )}

                                {coverMode === 'ai' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                            <div>
                                                <h4 className="text-sm font-bold text-purple-900">AI Magic Prompt</h4>
                                                <p className="text-xs text-purple-600 mt-0.5">Auto-generate a description based on your product image.</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const btn = document.getElementById('btn-magic-prompt');
                                                    const originalText = btn.innerHTML;
                                                    btn.innerHTML = `<span class="animate-spin">🔄</span> Thinking...`;
                                                    btn.disabled = true;

                                                    try {
                                                        const prodName = projectData?.product_name || "Product";
                                                        let refImage = null;
                                                        if (assets && assets.length > 0) refImage = assets[0].name;

                                                        const res = await fetch(`${API_URL}/projects/${projectId}/cover/gen-prompt`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ product_name: prodName, image_filename: refImage })
                                                        });
                                                        const data = await res.json();
                                                        if (data.error) throw new Error(data.error);

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
                                                className="px-4 py-2 bg-white text-purple-700 shadow-sm border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-50 transition-colors flex items-center gap-2"
                                            >
                                                <span>✨</span> Auto-Write
                                            </button>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Image Prompt</label>
                                            <textarea
                                                className="w-full p-4 text-sm border border-gray-300 rounded-xl h-32 resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow bg-gray-50/50"
                                                placeholder="Describe your cover image... (e.g. Professional studio shot of a red silk scarf, luxury style, minimal background)"
                                                id="ai-cover-prompt"
                                            ></textarea>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                const prompt = document.getElementById('ai-cover-prompt').value;
                                                if (!prompt) return alert("Please enter a prompt");

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

                                                    setPreviewUrl(`${API_URL}${data.url}`);
                                                    await handleSetCover('existing', data.filename);

                                                } catch (e) {
                                                    alert("Generation failed: " + e.message);
                                                } finally {
                                                    btn.innerText = originalText;
                                                    btn.disabled = false;
                                                    onUpdate();
                                                }
                                            }}
                                            id="btn-gen-cover"
                                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ImageIcon size={18} /> Generate Image
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: TEXT OVERLAY */}
                    {activeTab === 'text' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                                {/* Title Section */}
                                <div className="space-y-6">
                                    {/* Hook */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Short Title (Hook)</label>
                                            <button
                                                onClick={async () => {
                                                    // 1. Check Product Name
                                                    let prodName = projectData?.product_name;
                                                    if (!prodName || prodName === "Product" || !prodName.trim()) {
                                                        prodName = prompt("Enter Product Name for AI Hook Generation:", "");
                                                        if (!prodName) return;
                                                    }

                                                    setFetchingScript(true);
                                                    try {
                                                        // 2. Generate Hook & Tagline
                                                        const res = await fetch(`${API_URL}/projects/${projectId}/cover/gen-text`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ product_name: prodName, tone: "engaging" })
                                                        });
                                                        const data = await res.json();

                                                        if (!data.options || data.options.length === 0) throw new Error("No text generated");
                                                        const opt = data.options[0];

                                                        // Update Local State
                                                        const newOverlay = {
                                                            ...overlay,
                                                            title: opt.title,
                                                            subtitle: opt.subtitle
                                                        };
                                                        setOverlay(newOverlay);

                                                        // 3. Select First Image
                                                        if (assets && assets.length > 0) {
                                                            await handleSetCover('existing', assets[0].name);
                                                        }

                                                        // 4. Save & Apply (Timeline)
                                                        await submitOverlay(newOverlay);
                                                        const resTimeline = await fetch(`${API_URL}/projects/${projectId}/timeline/generate`, {
                                                            method: 'POST'
                                                        });

                                                        if (!resTimeline.ok) {
                                                            const err = await resTimeline.json();
                                                            const detail = err.detail || {};
                                                            const msg = typeof detail === 'string' ? detail : (detail.error || JSON.stringify(detail));

                                                            if (msg.includes("voice")) throw new Error("Missing Voiceover. Please go to Voice Studio.");
                                                            if (msg.includes("image")) throw new Error("Missing Images.");
                                                            throw new Error(msg);
                                                        }

                                                        alert("✨ Magic Setup Complete: Hook, Image & Timeline updated!");
                                                        onUpdate();

                                                    } catch (e) {
                                                        alert("Error: " + e.message);
                                                    } finally {
                                                        setFetchingScript(false);
                                                    }
                                                }}
                                                className="text-[10px] bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full font-bold border border-purple-100 hover:bg-purple-100 flex items-center gap-1.5 transition-colors"
                                                disabled={fetchingScript}
                                            >
                                                {fetchingScript ? <RefreshCw size={10} className="animate-spin" /> : <Mic size={10} />}
                                                {fetchingScript ? 'Generating...' : 'Auto-Generate Hook'}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={40}
                                            value={overlay.title}
                                            onChange={(e) => handleOverlayChange('title', e.target.value)}
                                            className="w-full h-12 px-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-800 placeholder-gray-300"
                                            placeholder="E.g. AMAZING DEAL!"
                                        />
                                    </div>

                                    {/* Subtitle */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Tagline (Optional)</label>
                                        <input
                                            type="text"
                                            maxLength={60}
                                            value={overlay.subtitle}
                                            onChange={(e) => handleOverlayChange('subtitle', e.target.value)}
                                            className="w-full h-12 px-4 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-700 placeholder-gray-300"
                                            placeholder="E.g. Limited time offer."
                                        />
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 my-8"></div>

                                {/* Styling Controls */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Colors */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Palette size={14} /> Text Color</label>
                                        <div className="flex gap-3">
                                            {['#FFFFFF', '#000000', '#FCD34D', '#EF4444', '#3B82F6'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => handleOverlayChange('color', c)}
                                                    className={`w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110 ${overlay.color === c ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'border-gray-200'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Background Style */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Layout size={14} /> Background Style</label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg inline-flex">
                                            {[
                                                { id: 'none', label: 'None' },
                                                { id: 'box', label: 'Box' },
                                                { id: 'gradient', label: 'Fade' }
                                            ].map(bg => (
                                                <button
                                                    key={bg.id}
                                                    onClick={() => handleOverlayChange('background', bg.id)}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${overlay.background === bg.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    {bg.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 block">Position</label>
                                    <div className="flex gap-4">
                                        {[
                                            { id: 'top', label: 'Top', icon: AlignVerticalJustifyStart },
                                            { id: 'center', label: 'Center', icon: AlignVerticalJustifyCenter },
                                            { id: 'bottom', label: 'Bottom', icon: AlignVerticalJustifyEnd }
                                        ].map(pos => (
                                            <button
                                                key={pos.id}
                                                onClick={() => handleOverlayChange('position', pos.id)}
                                                className={`flex-1 h-12 rounded-xl border flex items-center justify-center gap-2 transition-all ${overlay.position === pos.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                <pos.icon size={18} /> <span className="text-sm font-bold">{pos.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>


                                <div className="mt-10 pt-8 border-t border-gray-100">
                                    <button
                                        onClick={async () => {
                                            const btn = document.getElementById('btn-save-timeline');
                                            const originalText = btn.innerText;
                                            btn.innerText = "Applying...";
                                            btn.disabled = true;

                                            try {
                                                await submitOverlay(overlay);
                                                const res = await fetch(`${API_URL}/projects/${projectId}/timeline/generate`, {
                                                    method: 'POST'
                                                });
                                                if (!res.ok) {
                                                    const err = await res.json();
                                                    // Parse backend structured error
                                                    const detail = err.detail || {};
                                                    const msg = typeof detail === 'string' ? detail : (detail.error || JSON.stringify(detail));

                                                    // Provide specific guidance
                                                    if (msg.includes("voice")) {
                                                        throw new Error("Voiceover not found. Please go to 'Voice Studio' and generate speech first.");
                                                    } else if (msg.includes("image")) {
                                                        throw new Error("No images found. Please upload images to the Gallery.");
                                                    } else {
                                                        throw new Error(msg);
                                                    }
                                                }
                                                alert("✅ Cover saved and Timeline updated!");
                                            } catch (e) {
                                                alert("❌ Failed: " + e.message);
                                            } finally {
                                                btn.innerText = originalText;
                                                btn.disabled = false;
                                            }
                                        }}
                                        id="btn-save-timeline"
                                        className="w-full h-14 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm tracking-wide uppercase flex items-center justify-center gap-3"
                                    >
                                        <span className="text-xl">💾</span> Save & Apply to Timeline
                                    </button>
                                    <p className="text-center text-xs text-gray-400 mt-3">This will regenerate the timeline with your new cover settings.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Preview */}
                <div className="w-full md:w-[320px] flex-none">
                    <div className="sticky top-8">
                        <div className="bg-gray-900 rounded-[2rem] p-4 shadow-2xl border-4 border-gray-800 ring-4 ring-gray-100">
                            <div className="flex justify-center mb-4 opacity-50"><div className="w-12 h-1.5 bg-gray-700 rounded-full"></div></div>
                            <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative group isolation-auto">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" key={previewUrl} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-800">
                                        <ImageIcon size={48} className="opacity-50 mb-4" />
                                        <span className="text-xs font-bold tracking-widest opacity-50">NO COVER</span>
                                    </div>
                                )}

                                {/* Overlay Info Badge */}
                                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                    {isIntro && <span className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded-md font-bold shadow-sm">INTRO ON</span>}
                                    {overlay.title && <span className="text-[10px] bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded-md font-bold border border-white/10">TEXT ON</span>}
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-xs font-bold text-gray-400 mt-6 uppercase tracking-widest">Mobile Preview (9:16)</p>
                    </div>
                </div>

            </div>
        </div>
    );
}

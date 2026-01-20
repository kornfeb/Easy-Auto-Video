import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Settings2, Maximize, Crop as CropIcon, PaintBucket, Zap, CheckCircle2, RotateCw, X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { API_URL } from '../../config';

// --- Canvas & Media Helpers ---
const createMedia = (url) =>
    new Promise((resolve, reject) => {
        const isVideo = url.toLowerCase().split('?')[0].split('.').pop().match(/^(webm|mp4)$/);
        const media = isVideo ? document.createElement('video') : new Image();

        media.setAttribute('crossOrigin', 'anonymous');

        const timeout = setTimeout(() => {
            reject(new Error("Media load timeout (15s)"));
        }, 15000);

        if (isVideo) {
            media.addEventListener('loadeddata', () => {
                clearTimeout(timeout);
                // For videos, we sometimes need to seek slightly to ensure a frame is rendered
                if (media.currentTime === 0) media.currentTime = 0.1;
                resolve(media);
            }, { once: true });
            media.muted = true;
            media.playsInline = true;
        } else {
            media.addEventListener('load', () => {
                clearTimeout(timeout);
                // Final check for valid content
                if (media.naturalWidth === 0 || media.naturalHeight === 0) {
                    reject(new Error("Image loaded but has 0 dimensions."));
                } else {
                    resolve(media);
                }
            }, { once: true });
        }

        media.addEventListener('error', (err) => {
            clearTimeout(timeout);
            console.error("Media Error Event:", err);
            reject(new Error("Failed to load source at: " + url));
        });

        media.src = url;
    });

async function getCroppedImg(imageSrc, pixelCrop, mimeType = 'image/jpeg') {
    console.log("--- Generating Crop ---");
    console.log("Source:", imageSrc);
    console.log("PixelCrop:", pixelCrop);

    if (!pixelCrop || !pixelCrop.width || !pixelCrop.height) {
        throw new Error("Invalid crop dimensions.");
    }

    const media = await createMedia(imageSrc);

    // Log natural dimensions for debugging
    const nw = (media.naturalWidth || media.videoWidth);
    const nh = (media.naturalHeight || media.videoHeight);
    console.log("Natural Dimensions:", nw, "x", nh);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error("Could not get canvas context");

    canvas.width = Math.floor(pixelCrop.width);
    canvas.height = Math.floor(pixelCrop.height);

    // Draw the image/video to the canvas
    ctx.drawImage(
        media,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Canvas toBlob failed."));

            console.log("Generated Blob Size:", blob.size, "bytes");
            // If blob is suspiciously small, it might be a black/empty image
            if (blob.size < 500) {
                console.warn("Suspiciously small blob detected!");
            }

            resolve(blob);
        }, mimeType, 0.95);
    });
}

export default function ImageProcessor({ projectId, assets, onUpdate, onClose, initialSelection, onCropDone }) {
    const [selectedImages, setSelectedImages] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [statusText, setStatusText] = useState(null);
    const [processStatus, setProcessStatus] = useState(null);

    // --- Crop Mode State ---
    const [editMode, setEditMode] = useState(initialSelection?.length === 1 ? 'crop' : 'view'); // Auto-start in crop if 1 asset
    const [activeImage, setActiveImage] = useState(initialSelection?.length === 1 ? initialSelection[0] : null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Config State (Batch)
    const [config, setConfig] = useState({
        aspectRatio: '9:16',
        width: 1080,
        height: 1920,
        mode: 'fit', // 'fit' | 'fill'
        bgColor: '#000000'
    });

    // Media Loading State
    const [mediaState, setMediaState] = useState('idle'); // 'idle' | 'loading' | 'loaded' | 'error'
    const hasAutoOpened = useRef(false);

    // Stable URL for Cropper (Avoid reloads on Every Drag)
    const cropperMediaUrl = useMemo(() => {
        if (!activeImage || !assets) return null;
        const asset = assets.find(a => a.name === activeImage);
        if (!asset) return null;

        // Add timestamp ONLY once when image is selected to bust cache but stay stable during edit
        const ts = Date.now();
        const base = `${API_URL}${asset.url}`;
        if (asset.name.toLowerCase().endsWith('.webm') || asset.name.toLowerCase().endsWith('.mp4')) {
            return base;
        }
        return `${base}?t=${ts}`;
    }, [activeImage, assets]);

    const COLORS = ['#FFA500', '#FFFFFF', '#000000', '#FCD34D', '#EF4444', '#3B82F6', '#10B981', '#6366F1'];

    const [gridTs, setGridTs] = useState(Date.now());

    useEffect(() => {
        setGridTs(Date.now()); // Update local refresh whenever assets prop changes
        if (initialSelection && initialSelection.length > 0) {
            setSelectedImages(initialSelection);

            // Sandbox Mode Auto-Open: Only on first mount of this asset
            if (!hasAutoOpened.current && initialSelection.length === 1) {
                hasAutoOpened.current = true;
                startCrop(initialSelection[0]);
            }
        } else if (assets && assets.length > 0 && selectedImages.length === 0) {
            setSelectedImages(assets.map(a => a.name));
        }
    }, [assets, initialSelection]);

    const handleAspectRatio = (ratio) => {
        let w = 1080, h = 1920;
        if (ratio === '16:9') { w = 1920; h = 1080; }
        setConfig(prev => ({ ...prev, aspectRatio: ratio, width: w, height: h }));
    };

    const toggleSelection = (filename) => {
        if (selectedImages.includes(filename)) {
            setSelectedImages(prev => prev.filter(f => f !== filename));
        } else {
            setSelectedImages(prev => [...prev, filename]);
        }
    };

    // --- Batch Processing ---
    const handleProcess = async () => {
        if (selectedImages.length === 0) return alert("Select at least one image");

        setProcessing(true);
        setProcessStatus(null);

        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/images/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: selectedImages,
                    process_all: false,
                    width: config.width,
                    height: config.height,
                    mode: config.mode,
                    bg_color: config.bgColor
                })
            });
            const data = await res.json();
            const successCount = data.results.filter(r => r.status === 'OK').length;
            setProcessStatus({ success: successCount, total: data.results.length });
            onUpdate();
        } catch (err) {
            alert("Processing Failed: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    // --- Crop Logic ---
    const startCrop = (filename) => {
        console.log("Starting Crop for:", filename);
        setMediaState('loading');
        setActiveImage(filename);
        setEditMode('crop');
        setZoom(1);
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const applyCrop = async () => {
        console.log("--- START APPLY CROP ---");
        if (!activeImage) {
            console.error("No active image to crop");
            return;
        }

        if (!croppedAreaPixels) {
            console.warn("croppedAreaPixels is null. Waiting for onCropComplete...");
            alert("Please move or resize the crop box slightly before capturing.");
            return;
        }

        setProcessing(true);
        setStatusText("CAPTURING FRAME...");

        try {
            console.log("Selected Asset for Crop:", activeImage);
            console.log("Media URL for Canvas:", cropperMediaUrl);
            console.log("Pixel Coordinates:", croppedAreaPixels);

            const croppedImageBlob = await getCroppedImg(
                cropperMediaUrl,
                croppedAreaPixels,
                'image/jpeg'
            );

            console.log("Cropped Blob Generated Successfully:", croppedImageBlob?.size, "bytes");

            if (onCropDone) {
                console.log("Calling onCropDone callback (Sandbox mode)...");
                onCropDone(croppedImageBlob);

                // Close Overlay
                setEditMode('view');
                setActiveImage(null);
                console.log("Overlay Closed.");
            } else if (projectId) {
                console.log("Uploading cropped result to project:", projectId);
                setStatusText("UPLOADING TO STORAGE...");

                const formData = new FormData();
                // Ensure we use the original filename to trigger the backend's backup-and-overwrite logic
                formData.append('file', croppedImageBlob, activeImage);

                const res = await fetch(`${API_URL}/projects/${projectId}/upload/image?auto_normalize=false`, {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    console.log("Manual Crop Upload Successful.");
                    if (onUpdate) onUpdate();

                    // Close Overlay
                    setEditMode('view');
                    setActiveImage(null);
                } else {
                    const errorData = await res.json();
                    throw new Error(errorData.detail || "Failed to save cropped image to server.");
                }
            } else {
                console.warn("No capture target: onCropDone and projectId are both missing!");
                alert("Internal Error: Nowhere to save the crop result.");
            }
        } catch (e) {
            console.error("CAPTURE FAILED:", e);
            alert(`CAPTURE ERROR: ${e.message}\n\nPlease try again or check if the image is accessible.`);
        } finally {
            setProcessing(false);
            setStatusText(null);
            console.log("--- END APPLY CROP ---");
        }
    };

    return (
        <div
            className={`rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-full w-full relative ${editMode === 'crop' ? 'bg-black' : 'bg-white'}`}
        >
            <div className="hidden">CORE INITIALIZED - v6 (Tailwind Restored)</div>

            {/* --- CROPPER OVERLAY (FULL SCREEN) --- */}
            {editMode === 'crop' && activeImage && (
                <div className="fixed inset-0 z-[999999] bg-black flex flex-col font-sans">
                    {/* Header */}
                    <div className="bg-gray-900 border-b border-white/10 px-6 py-5 flex items-center justify-between flex-none">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                                <CropIcon size={20} className="text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-white uppercase tracking-tighter">Frame Precision</span>
                                <span className="text-[10px] text-gray-400 font-mono italic">{activeImage}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-widest hidden sm:block">
                                STATUS: {mediaState.toUpperCase()}
                            </div>
                            <button
                                onClick={() => { setEditMode('view'); setActiveImage(null); }}
                                className="bg-gray-800 hover:bg-red-500 text-white p-2.5 rounded-full transition-all active:scale-95 shadow-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Cropper Container */}
                    <div className="flex-1 relative bg-black overflow-hidden select-none">
                        {mediaState === 'loading' && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm">
                                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                                <p className="text-sm font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Initializing Media Stream</p>
                            </div>
                        )}

                        {mediaState === 'error' && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 p-12 text-center">
                                <div className="p-6 bg-red-500/10 rounded-full mb-6">
                                    <X size={64} className="text-red-500" />
                                </div>
                                <h4 className="text-2xl font-black text-white mb-3">Failed to Load Content</h4>
                                <p className="text-gray-500 max-w-lg text-lg leading-relaxed">The browser blocked access to this asset or the target server is unreachable.</p>
                                <button onClick={() => setEditMode('view')} className="mt-10 px-10 py-4 bg-gray-800 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-700 transition-all active:scale-95">Abort Edit</button>
                            </div>
                        )}

                        {cropperMediaUrl && (
                            <Cropper
                                image={!assets.find(a => a.name === activeImage)?.name.toLowerCase().endsWith('.webm') ? cropperMediaUrl : undefined}
                                video={assets.find(a => a.name === activeImage)?.name.toLowerCase().endsWith('.webm') ? cropperMediaUrl : undefined}
                                crop={crop}
                                zoom={zoom}
                                aspect={(config.width && config.height) ? (config.width / config.height) : (9 / 16)}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                onMediaLoaded={() => { console.log("Media Ready!"); setMediaState('loaded'); }}
                                onMediaError={(err) => { console.error("Media Error:", err); setMediaState('error'); }}
                                showGrid={true}
                                style={{
                                    containerStyle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                                    cropAreaStyle: {
                                        border: '4px solid white',
                                        boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.95)',
                                        outline: '1px solid rgba(255,255,255,0.3)'
                                    }
                                }}
                                mediaProps={{
                                    crossOrigin: 'anonymous'
                                }}
                            />
                        )}
                    </div>

                    {/* Footer Controls */}
                    <div className="bg-gray-950 px-8 py-10 border-t border-white/5 flex flex-col gap-10 flex-none items-center">
                        <div className="w-full max-w-2xl">
                            <div className="flex items-center justify-between text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4 px-1">
                                <span>Zoom Intensity</span>
                                <span className="text-blue-400">{zoom.toFixed(2)}x</span>
                            </div>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={5}
                                step={0.01}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-blue-600 outline-none hover:bg-gray-700 transition-colors"
                            />
                        </div>

                        <div className="flex gap-6 w-full max-w-2xl justify-center">
                            <button
                                onClick={() => setEditMode('view')}
                                className="flex-1 max-w-[200px] py-4 rounded-2xl font-black bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-all uppercase text-[11px] tracking-widest active:scale-95 border border-white/5"
                            >
                                Discard
                            </button>
                            <button
                                onClick={applyCrop}
                                disabled={processing || mediaState !== 'loaded'}
                                className="flex-1 max-w-[300px] py-4 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/20 disabled:opacity-20 uppercase text-[11px] tracking-widest active:scale-95 disabled:active:scale-100"
                            >
                                {processing ? <RotateCw className="animate-spin" size={18} /> : <Check size={18} />}
                                {statusText || (onCropDone ? "Capture Frame" : "Save & Overwrite")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NORMAL VIEW --- */}
            <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between flex-none">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-lg">
                        <Settings2 size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight">Image Processor</h3>
                        <p className="text-xs text-gray-400 font-medium">Resize & Pad for Video Platforms</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    Dismiss
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* Left: Configuration Panel */}
                <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto flex-none flex flex-col gap-8">

                    {/* Target Size */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 block">Target Platform</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={() => handleAspectRatio('9:16')}
                                className={`h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${config.aspectRatio === '9:16' ? 'bg-white border-blue-500 text-blue-600 shadow-md scale-[1.02]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                            >
                                <div className="w-4 h-7 border-2 border-current rounded-sm"></div>
                                <span className="text-xs font-bold">TikTok (9:16)</span>
                            </button>
                            <button
                                onClick={() => handleAspectRatio('16:9')}
                                className={`h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${config.aspectRatio === '16:9' ? 'bg-white border-blue-500 text-blue-600 shadow-md scale-[1.02]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                            >
                                <div className="w-7 h-4 border-2 border-current rounded-sm"></div>
                                <span className="text-xs font-bold">YouTube (16:9)</span>
                            </button>
                        </div>

                        {/* Input Configs */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Width</label>
                                <input
                                    type="number"
                                    value={config.width}
                                    onChange={(e) => setConfig({ ...config, width: parseInt(e.target.value), aspectRatio: 'custom' })}
                                    className="w-full text-center py-2 rounded-lg border border-gray-200 text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex items-end pb-2 text-gray-400">x</div>
                            <div className="flex-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Height</label>
                                <input
                                    type="number"
                                    value={config.height}
                                    onChange={(e) => setConfig({ ...config, height: parseInt(e.target.value), aspectRatio: 'custom' })}
                                    className="w-full text-center py-2 rounded-lg border border-gray-200 text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                    </div>

                    <div className="h-px bg-gray-200"></div>

                    {/* Resize Mode */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 block">Fit Logic</label>
                        <div className="flex bg-gray-200 p-1 rounded-xl">
                            <button
                                onClick={() => setConfig({ ...config, mode: 'fit' })}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${config.mode === 'fit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Maximize size={14} /> Fit (Pad)
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, mode: 'fill' })}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${config.mode === 'fill' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <CropIcon size={14} /> Fill (Crop)
                            </button>
                        </div>
                    </div>

                    {/* Background Color */}
                    <div className={config.mode === 'fill' ? 'opacity-30 pointer-events-none transition-opacity' : 'opacity-100 transition-opacity'}>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <PaintBucket size={14} /> Background Color
                        </label>
                        <div className="grid grid-cols-5 gap-2 mb-3">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setConfig({ ...config, bgColor: c })}
                                    className={`w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110 ${config.bgColor === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : 'border-gray-200'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    {/* Manual Crop Button (Only when 1 selected) */}
                    {selectedImages.length === 1 && (
                        <button
                            onClick={() => startCrop(selectedImages[0])}
                            disabled={processing}
                            className="w-full py-3 mb-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            <CropIcon size={18} /> Crop Image
                        </button>
                    )}

                    {/* Process Button */}
                    <button
                        onClick={handleProcess}
                        disabled={processing || selectedImages.length === 0}
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <RotateCw className="animate-spin" size={20} /> Processing...
                            </>
                        ) : (
                            <>
                                <Zap size={20} className="text-yellow-400 fill-yellow-400" />
                                {processStatus ? 'Run Again' : 'Process Selected'}
                            </>
                        )}
                    </button>
                    {processStatus && (
                        <div className="text-center mt-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                <CheckCircle2 size={12} /> {processStatus.success}/{processStatus.total} Done
                            </div>
                        </div>
                    )}

                </div>

                {/* Right: Selection Gallery */}
                <div className="flex-1 bg-white p-6 overflow-y-auto w-full">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            Select Images to Process
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">{selectedImages.length}</span>
                        </h4>
                        <div className="flex gap-2 text-xs">
                            <button
                                onClick={() => setSelectedImages(assets.map(a => a.name))}
                                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg font-bold text-gray-600 transition-colors"
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setSelectedImages([])}
                                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg font-bold text-gray-600 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                        {assets.map(asset => {
                            const isSelected = selectedImages.includes(asset.name);
                            return (
                                <div
                                    key={asset.name}
                                    onClick={() => toggleSelection(asset.name)}
                                    className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer transition-all border-2 group ${isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-gray-100 opacity-60 hover:opacity-100 hover:border-blue-300'}`}
                                >
                                    <div className="w-full h-full bg-gray-100">
                                        {asset.name.toLowerCase().endsWith('.webm') || asset.name.toLowerCase().endsWith('.mp4') ? (
                                            <video src={`${API_URL}${asset.url}?t=${gridTs}#t=0.5`} className="w-full h-full object-cover" muted />
                                        ) : (
                                            <img
                                                src={`${API_URL}${asset.url}?t=${gridTs}`}
                                                className="w-full h-full object-cover"
                                                alt={asset.name}
                                                loading="lazy"
                                            />
                                        )}
                                    </div>

                                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white border border-gray-200 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'text-transparent'}`}>
                                        <CheckCircle2 size={14} />
                                    </div>

                                    {/* Filename Badge */}
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 backdrop-blur-sm">
                                        <p className="text-[10px] text-white truncate font-medium text-center">{asset.name}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}

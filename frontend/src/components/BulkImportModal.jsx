import React, { useState } from 'react';
import { X, Upload, FileJson, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { API_URL } from '../config';

export default function BulkImportModal({ isOpen, onClose, onImportComplete }) {
    const [jsonFile, setJsonFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "application/json") {
            setJsonFile(file);
            setError(null);
        } else {
            setError("Please select a valid JSON file.");
        }
    };

    const handleUpload = async () => {
        if (!jsonFile) return;

        setIsProcessing(true);
        setError(null);

        try {
            const text = await jsonFile.text();
            const data = JSON.parse(text);

            const res = await fetch(`${API_URL}/projects/bulk-import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to import projects");
            }

            const result = await res.json();
            setImportResults(result);
            if (onImportComplete) onImportComplete();
        } catch (e) {
            setError(e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <FileJson size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Bulk Project Import</h2>
                            <p className="text-sm text-gray-500 font-medium">Create multiple projects from a JSON file</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {!importResults ? (
                        <div className="space-y-6">
                            <div
                                className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all ${jsonFile ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                            >
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${jsonFile ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                                    <Upload size={28} />
                                </div>
                                <div className="text-center">
                                    <p className="text-base font-bold text-gray-900">
                                        {jsonFile ? jsonFile.name : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-sm text-gray-500 font-medium mt-1">
                                        {jsonFile ? `${(jsonFile.size / 1024).toFixed(1)} KB` : 'JSON file containing project data'}
                                    </p>
                                </div>
                                {jsonFile && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setJsonFile(null);
                                        }}
                                        className="mt-2 text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> Remove
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!jsonFile || isProcessing}
                                className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 active:scale-95"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <FileJson size={20} />}
                                {isProcessing ? 'Importing projects...' : 'Start Bulk Import'}
                            </button>
                        </div>
                    ) : (
                        /* Results View */
                        <div className="space-y-6">
                            <div className="flex items-center justify-center gap-4 mb-8">
                                <div className="px-6 py-4 bg-green-50 border border-green-100 rounded-2xl text-center flex-1">
                                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Successfully Imported</p>
                                    <p className="text-3xl font-black text-green-700">{importResults.imported}</p>
                                </div>
                                <div className="px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-center flex-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Items</p>
                                    <p className="text-3xl font-black text-gray-700">{importResults.total}</p>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 border-y border-gray-50 py-4 custom-scrollbar">
                                {importResults.results.map((res, i) => (
                                    <div key={i} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${res.status === 'initialized' ? 'border-gray-100 bg-white' : 'border-red-100 bg-red-50'}`}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {res.status === 'initialized' ? (
                                                <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                                            ) : (
                                                <AlertCircle size={18} className="text-red-500 shrink-0" />
                                            )}
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-gray-900 truncate">
                                                    {res.product_name || res.product || 'Unnamed Product'}
                                                </p>
                                                <p className="text-[11px] font-mono text-gray-400 truncate">
                                                    {res.project_id || res.error}
                                                </p>
                                            </div>
                                        </div>
                                        {res.status === 'initialized' && (
                                            <div className="shrink-0 text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded-md">
                                                {res.images_count} images
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

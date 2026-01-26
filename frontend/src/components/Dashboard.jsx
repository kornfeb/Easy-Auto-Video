import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, AlertCircle, Clock, Video, ChevronRight, Loader2, Trash2, Edit2, Save, X, RotateCcw, Settings, FileJson, ExternalLink, Download } from 'lucide-react';
import { API_URL } from '../config';
import GlobalSettingsModal from './GlobalSettingsModal';
import BulkImportModal from './BulkImportModal';
import BackgroundTasksViewer from './BackgroundTasksViewer';


export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newProjectId, setNewProjectId] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [newImageUrls, setNewImageUrls] = useState('');
    const [newBadgeName, setNewBadgeName] = useState('');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('last_updated');
    const [sortOrder, setSortOrder] = useState('desc');

    const [newProductUrl, setNewProductUrl] = useState('');
    const [creating, setCreating] = useState(false);

    // Edit States
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [updating, setUpdating] = useState(false);
    const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);
    const [previewVideoUrl, setPreviewVideoUrl] = useState(null);

    const navigate = useNavigate();

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/projects?page=${page}&limit=20&sort_by=${sortBy}&order=${sortOrder}`);
            const data = await res.json();
            setProjects(data.projects || []);
            setTotalPages(data.total_pages || 1);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setLoading(false);
        }
    };

    const generateId = (badge, product) => {
        if (isIdManuallyEdited) return;

        const now = new Date();
        const yymmdd = now.getFullYear().toString().slice(-2) +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');

        const slugify = (text) => text.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 20);

        let sBadge = slugify(badge || 'batch');
        let sProduct = slugify(product || 'untitled');

        setNewProjectId(`${yymmdd}_${sBadge}-${sProduct}`);
    };

    const handleBadgeNameChange = (val) => {
        setNewBadgeName(val);
        generateId(val, newProductName);
    };

    const handleNameChange = (name) => {
        setNewProductName(name);
        generateId(newBadgeName, name);
    };

    useEffect(() => {
        fetchProjects();
    }, [page, sortBy, sortOrder]);

    useEffect(() => {
        // Initial ID
        generateId('', '');
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        // Required fields: ID, Name, ImageURLs
        if (!newProjectId.trim() || !newProductName.trim() || !newImageUrls.trim()) {
            alert("Please fill in all required fields marked with *");
            return;
        }

        setCreating(true);
        try {
            // Split URLs by newline and filter empty
            const imageUrlsArray = newImageUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);

            const res = await fetch(`${API_URL}/projects/initialize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: newProjectId,
                    product_name: newProductName.trim(),
                    badge_name: newBadgeName.trim(),
                    product_url: newProductUrl.trim() || null, // Optional
                    image_urls: imageUrlsArray
                })
            });
            if (res.ok) {
                setNewProjectId('');
                setNewProductName('');
                setNewBadgeName('');
                setNewImageUrls('');
                setNewProductUrl('');
                fetchProjects();

                // Refresh ID for next project
                setIsIdManuallyEdited(false);
                generateId('', '');
            } else {
                alert("Failed to create project");
            }
        } catch (error) {
            alert("Error creating project");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (e, projectId) => {
        e.stopPropagation(); // Don't navigate
        if (!window.confirm(`Are you sure you want to delete project "${projectId}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`${API_URL}/projects/${projectId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchProjects();
            } else {
                alert("Failed to delete project");
            }
        } catch (error) {
            alert("Error deleting project");
        }
    };

    const handleUpdateName = async (e, projectId) => {
        e.stopPropagation();
        setUpdating(true);
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_name: editingName })
            });
            if (res.ok) {
                setEditingProjectId(null);
                fetchProjects();
            } else {
                alert("Failed to update name");
            }
        } catch (error) {
            alert("Error updating name");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-6">
            <header className="mb-12 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Video size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Easy Auto Video</h1>
                        <p className="text-gray-500 font-medium">Automated Video Production Pipeline</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBulkImport(true)}
                        className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-100 shadow-sm transition-all font-bold text-sm"
                        title="Bulk Import Projects"
                    >
                        <FileJson size={20} />
                        <span className="hidden sm:inline">Bulk Import</span>
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-3 bg-white text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-100 shadow-sm transition-all"
                        title="Global Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-3 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-100 shadow-sm transition-all"
                        title="Reload Dashboard"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </header>

            {showSettings && <GlobalSettingsModal onClose={() => setShowSettings(false)} />}
            {showBulkImport && (
                <BulkImportModal
                    isOpen={showBulkImport}
                    onClose={() => setShowBulkImport(false)}
                    onImportComplete={() => fetchProjects()}
                />
            )}

            {previewVideoUrl && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-12">
                    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md" onClick={() => setPreviewVideoUrl(null)}></div>
                    <div className="relative w-full max-w-lg bg-black rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/10">
                        <div className="absolute top-4 right-4 z-20">
                            <button onClick={() => setPreviewVideoUrl(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="aspect-[9/16] bg-black flex items-center justify-center relative">
                            <video
                                src={`${API_URL}${previewVideoUrl}`}
                                controls
                                autoPlay
                                className="h-full w-full object-contain"
                            />
                        </div>

                        <div className="p-6 bg-white flex flex-col gap-3">
                            <h3 className="text-lg font-bold text-gray-900">Video Preview</h3>
                            <a
                                href={`${API_URL}${previewVideoUrl}`}
                                download
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95"
                            >
                                <Download size={20} /> Download MP4
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Project Section */}

            <div className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-100 mb-12 border border-blue-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2 relative z-10">
                    <Plus size={24} className="text-blue-500" /> Start New Project
                </h2>
                <form onSubmit={handleCreate} className="flex flex-col gap-4 relative z-10">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Product Landing Page (Optional)</label>
                        <input
                            type="text"
                            value={newProductUrl}
                            onChange={(e) => setNewProductUrl(e.target.value)}
                            placeholder="e.g. https://shopee.co.th/product/..."
                            className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Badge Name (Batch / Folder) <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={newBadgeName}
                                onChange={(e) => handleBadgeNameChange(e.target.value)}
                                placeholder="e.g. SummerSale, Batch01"
                                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Product Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={newProductName}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g. Gambol Sandals AH98"
                                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Project ID (Auto-Generated) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={newProjectId}
                            onChange={(e) => {
                                setNewProjectId(e.target.value);
                                setIsIdManuallyEdited(true);
                            }}
                            placeholder="e.g. 260120_badge-product"
                            className="w-full px-5 py-2 border border-blue-100 bg-blue-50/20 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono text-xs text-blue-700"
                            required
                        />
                        <p className="text-[10px] text-gray-400 mt-1 pl-1">Format: YYMMDD_badgeName-productName</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Product Image URLs (One per line) <span className="text-red-500">*</span></label>
                        <textarea
                            value={newImageUrls}
                            onChange={(e) => setNewImageUrls(e.target.value)}
                            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
                            className="w-full h-32 px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300 resize-y font-mono text-xs"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={creating}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm uppercase tracking-wider"
                    >
                        {creating ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                        {creating ? 'Initialize Project & Assets...' : 'Start Project'}
                    </button>
                </form>
            </div>

            {/* Project List */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800">Recent Projects</h2>
                    {/* <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{projects.length}</span> */}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                    <span className="text-gray-400 mr-2">Sort by:</span>
                    <button
                        onClick={() => {
                            const nextOrder = sortBy === 'badge_name' && sortOrder === 'asc' ? 'desc' : 'asc';
                            setSortBy('badge_name');
                            setSortOrder(nextOrder);
                        }}
                        className={`hover:text-blue-600 transition-colors ${sortBy === 'badge_name' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
                    >
                        Badge Name {sortBy === 'badge_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                        onClick={() => {
                            const nextOrder = sortBy === 'last_updated' && sortOrder === 'asc' ? 'desc' : 'asc';
                            setSortBy('last_updated');
                            setSortOrder(nextOrder);
                        }}
                        className={`hover:text-blue-600 transition-colors ${sortBy === 'last_updated' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
                    >
                        Date {sortBy === 'last_updated' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                        onClick={() => {
                            const nextOrder = sortBy === 'product_name' && sortOrder === 'asc' ? 'desc' : 'asc';
                            setSortBy('product_name');
                            setSortOrder(nextOrder);
                        }}
                        className={`hover:text-blue-600 transition-colors ${sortBy === 'product_name' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
                    >
                        Product {sortBy === 'product_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                    <Loader2 className="animate-spin mb-3 text-blue-500" size={32} />
                    Loading projects...
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Folder size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No projects found.</p>
                    <p className="text-sm text-gray-400">Create your first video project above!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4">
                        {projects.map((p) => (
                            <div
                                key={p.project_id}
                                onClick={() => !editingProjectId && navigate(`/project/${p.project_id}`)}
                                className={`bg-white p-5 rounded-xl shadow-sm border transition-all flex justify-between items-center ${editingProjectId ? 'border-gray-100 cursor-default' : 'border-gray-100 hover:shadow-md hover:border-blue-200 cursor-pointer group'}`}
                            >
                                <div className="flex items-center gap-5 flex-1">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Video size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded uppercase tracking-wider">{p.badge_name || 'No Batch'}</span>
                                            <span className="text-[11px] font-mono text-gray-400">ID: {p.project_id}</span>
                                        </div>

                                        {editingProjectId === p.project_id ? (
                                            <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    className="text-lg font-bold border-b-2 border-blue-500 outline-none py-0.1 text-gray-900 w-full max-w-sm"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleUpdateName(e, p.project_id);
                                                        if (e.key === 'Escape') setEditingProjectId(null);
                                                    }}
                                                />
                                                <button onClick={e => handleUpdateName(e, p.project_id)} disabled={updating} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={16} /></button>
                                                <button onClick={e => { e.stopPropagation(); setEditingProjectId(null); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                                {p.product_name || 'Untitled Product'}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProjectId(p.project_id);
                                                        setEditingName(p.product_name || '');
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-blue-500 transition-all border-none bg-transparent"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <AlertCircle size={12} /> {p.status}
                                            </span>
                                            {p.last_updated && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {new Date(p.last_updated).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Quick Actions */}
                                    <div className="flex gap-2 items-center mr-2">
                                        {p.product_url && (
                                            <a
                                                href={p.product_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center border border-blue-100"
                                                title="View Product Page"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                        {p.video_url && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewVideoUrl(p.video_url);
                                                }}
                                                className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm flex items-center justify-center border border-green-100"
                                                title="Preview & Download Video"
                                            >
                                                <Download size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(e, p.project_id)}
                                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border-none bg-transparent"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                        <ChevronRight className="text-gray-300" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 border rounded-xl hover:bg-gray-50 disabled:opacity-50 text-sm font-bold transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${page === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-gray-50 text-gray-600'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 border rounded-xl hover:bg-gray-50 disabled:opacity-50 text-sm font-bold transition-all"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
            <BackgroundTasksViewer />
        </div>
    );
}


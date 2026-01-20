import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, AlertCircle, Clock, Video, ChevronRight, Loader2, Trash2, Edit2, Save, X, RotateCcw } from 'lucide-react';
import { API_URL } from '../config';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newProjectId, setNewProjectId] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newImageUrls, setNewImageUrls] = useState('');
    const [newProductUrl, setNewProductUrl] = useState('');
    const [creating, setCreating] = useState(false);

    // Edit States
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [updating, setUpdating] = useState(false);
    const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);

    const navigate = useNavigate();

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            const data = await res.json();
            // Sort by Created Date / Timestamp desc (assuming ID starts with YYYY-MM-DD or is time based)
            // Or sort by last_updated if available
            const sorted = data.sort((a, b) => {
                const dateA = a.created_at || a.last_updated || '';
                const dateB = b.created_at || b.last_updated || '';
                return dateB.localeCompare(dateA);
            });
            setProjects(sorted);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNameChange = (name) => {
        setNewProductName(name);
        if (!isIdManuallyEdited) {
            // Generate Project ID: YYYY-MM-DD_HHMM_slug
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');

            // Create slug: STRICT URL SAFE (a-z, 0-9 only)
            let slug = name.trim().toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 30); // Limit length

            // If slug is empty or just hyphens, use 'untitled' or skip
            if (!slug || slug.length < 2) {
                slug = 'untitled';
            }

            setNewProjectId(`${yyyy}-${mm}-${dd}_${hh}${min}_${slug}`);
        }
    };

    useEffect(() => {
        fetchProjects();

        // Pre-fill Project ID: YYYY-MM-DD_HHMM_untitled
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        setNewProjectId(`${yyyy}-${mm}-${dd}_${hh}${min}_untitled`);
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
                    product_url: newProductUrl.trim() || null, // Optional
                    image_urls: imageUrlsArray
                })
            });
            if (res.ok) {
                setNewProjectId('');
                setNewProductName('');
                setNewImageUrls('');
                setNewProductUrl('');
                fetchProjects();

                // Refresh ID for next project
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const hh = String(now.getHours()).padStart(2, '0');
                const min = String(now.getMinutes()).padStart(2, '0');
                setNewProjectId(`${yyyy}-${mm}-${dd}_${hh}${min}_untitled`);
                setIsIdManuallyEdited(false); // Reset manual edit flag
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
                <button
                    onClick={() => window.location.reload()}
                    className="p-3 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-100 shadow-sm transition-all"
                    title="Reload Dashboard"
                >
                    <RotateCcw size={20} />
                </button>
            </header>

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
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Project ID <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={newProjectId}
                                onChange={(e) => {
                                    setNewProjectId(e.target.value);
                                    setIsIdManuallyEdited(true);
                                }}
                                placeholder="e.g. 2026-01-20_1430_gambol-sandals"
                                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300 font-mono text-sm"
                                required
                            />
                            <p className="text-[10px] text-gray-400 mt-1 pl-1">Auto-generated from name. Format: YYYY-MM-DD_HHMM_slug</p>
                        </div>
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
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-gray-800">Recent Projects</h2>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{projects.length}</span>
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
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                        {p.project_id}
                                    </h3>

                                    {editingProjectId === p.project_id ? (
                                        <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                className="text-sm border-b-2 border-blue-500 outline-none py-0.5 font-medium text-gray-700 w-full max-w-sm"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleUpdateName(e, p.project_id);
                                                    if (e.key === 'Escape') setEditingProjectId(null);
                                                }}
                                            />
                                            <button onClick={e => handleUpdateName(e, p.project_id)} disabled={updating} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={16} /></button>
                                            <button onClick={e => { e.stopPropagation(); setEditingProjectId(null); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 font-medium mb-1 flex items-center gap-2">
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
                                <button
                                    onClick={(e) => handleDelete(e, p.project_id)}
                                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 border-none bg-transparent"
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
            )}
        </div>
    );
}

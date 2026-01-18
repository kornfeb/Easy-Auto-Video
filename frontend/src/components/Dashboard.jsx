import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, AlertCircle, Clock, Video, ChevronRight, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newProjectId, setNewProjectId] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newImageUrls, setNewImageUrls] = useState('');
    const [newProductUrl, setNewProductUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const navigate = useNavigate();

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            const data = await res.json();
            setProjects(data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
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
            } else {
                alert("Failed to create project");
            }
        } catch (error) {
            alert("Error creating project");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-6">
            <header className="mb-12 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                    <Video size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Easy Auto Video</h1>
                    <p className="text-gray-500 font-medium">Automated Video Production Pipeline</p>
                </div>
            </header>

            {/* Create Project Section */}
            <div className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-100 mb-12 border border-blue-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2 relative z-10">
                    <Plus size={24} className="text-blue-500" /> Start New Project
                </h2>
                <form onSubmit={handleCreate} className="flex flex-col gap-4 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Project ID <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={newProjectId}
                                onChange={(e) => setNewProjectId(e.target.value)}
                                placeholder="e.g. shoppee-promo-1"
                                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Product Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={newProductName}
                                onChange={(e) => setNewProductName(e.target.value)}
                                placeholder="e.g. Super Blender 3000"
                                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                                required
                            />
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
                            onClick={() => navigate(`/project/${p.project_id}`)}
                            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex justify-between items-center"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Video size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{p.project_id}</h3>
                                    <div className="text-sm text-gray-500 font-medium mb-1">{p.product_name || 'Untitled Product'}</div>
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

                            <div className="pr-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                <ChevronRight className="text-gray-300" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

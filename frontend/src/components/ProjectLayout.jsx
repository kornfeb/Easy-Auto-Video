import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Image as ImageIcon, FileText, Mic,
    Music, Film, ShieldCheck, Video, Activity, Terminal, Settings
} from 'lucide-react';
import { API_URL } from '../config';

// Steps
import InputImages from './steps/InputImages';
import ScriptEditor from './steps/ScriptEditor';
import VoiceManager from './steps/VoiceManager';
import MusicManager from './MusicManager';
import TimelineManager from './steps/TimelineManager';
import RenderValidator from './RenderValidator';
import VideoRenderer from './VideoRenderer';
import LogViewer from './steps/LogViewer';
import SettingsManager from './steps/SettingsManager';

const NAV_ITEMS = [
    { id: 'section-images', label: 'Images', icon: ImageIcon },
    { id: 'section-script', label: 'Script', icon: FileText },
    { id: 'section-voice', label: 'Voice', icon: Mic },
    { id: 'section-music', label: 'Music', icon: Music },
    { id: 'section-timeline', label: 'Timeline', icon: Film },
    { id: 'section-dry-run', label: 'Dry Run', icon: ShieldCheck },
    { id: 'section-render', label: 'Render', icon: Video },
    { id: 'section-settings', label: 'Settings', icon: Settings },
    { id: 'section-logs', label: 'System Logs', icon: Terminal },
];

export default function ProjectLayout() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('section-images');

    // Fetch Logic
    const loadProject = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            const data = await res.json();
            const found = data.find(p => p.project_id === id);
            setProject(found || null);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProject();
    }, [id]);

    // Scroll Spy Logic
    useEffect(() => {
        if (loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.2, rootMargin: '-20% 0px -60% 0px' }
        );

        NAV_ITEMS.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [loading]);

    const scrollToSection = (sectionId) => {
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400">
            <div className="flex flex-col items-center gap-2">
                <div className="animate-spin text-blue-500"><Activity size={32} /></div>
                Loading Workspace...
            </div>
        </div>
    );

    if (!project) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Project Not Found</h2>
            <Link to="/" className="text-blue-600 hover:underline">Return to Dashboard</Link>
        </div>
    );

    const props = {
        projectId: id,
        lastUpdated: project.last_updated,
        projectData: project,
        onUpdate: loadProject
    };

    // Safe Date Formatting
    const safeDate = (d) => {
        if (!d) return 'N/A';
        const date = new Date(d);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    };
    const safeTime = (d) => {
        if (!d) return 'N/A';
        const date = new Date(d);
        return isNaN(date.getTime()) ? 'Invalid Time' : date.toLocaleTimeString();
    };

    return (
        <div className="h-screen bg-white flex flex-col font-sans text-gray-900 overflow-hidden">

            {/* 1. Header (Global Navigation) */}
            <header className="h-16 flex-none bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {project.project_id.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 leading-tight">{project.project_id}</h1>
                            {project.product_name && <p className="text-[10px] text-gray-500 max-w-[200px] truncate">{project.product_name}</p>}
                        </div>
                    </div>
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border tracking-wide ${project.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    <div className={`w-2 h-2 rounded-full ${project.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    {project.status || 'unknown'}
                </div>
            </header>

            {/* 2. Main Two-Column Layout */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left Column: Persistent Menu */}
                <aside className="w-[260px] flex-none bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto">
                    <nav className="p-4 space-y-1 flex-1">
                        <div className="px-3 py-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pipeline Steps</h3>
                        </div>
                        {NAV_ITEMS.map(item => {
                            const isActive = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${isActive
                                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50 font-bold'
                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium'
                                        }`}
                                >
                                    <item.icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="text-[10px] text-gray-400 font-medium space-y-1">
                            <div className="flex justify-between"><span>Created:</span> <span>{safeDate(project.created_at)}</span></div>
                            <div className="flex justify-between"><span>Updated:</span> <span>{safeTime(project.last_updated)}</span></div>
                        </div>
                    </div>
                </aside>

                {/* Right Column: Work Area */}
                <main className="flex-1 bg-white overflow-y-auto scroll-smooth" id="main-scroll-container">
                    <div className="max-w-6xl mx-auto px-10 py-12 space-y-20 pb-40">

                        {/* Sections */}
                        <section id="section-images" className="scroll-mt-24 min-h-[50vh]">
                            <InputImages {...props} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-script" className="scroll-mt-24 min-h-[50vh]">
                            <ScriptEditor {...props} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-voice" className="scroll-mt-24 min-h-[50vh]">
                            <VoiceManager {...props} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-music" className="scroll-mt-24 min-h-[50vh]">
                            <MusicManager {...props} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-timeline" className="scroll-mt-24 min-h-[50vh]">
                            <TimelineManager {...props} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-dry-run" className="scroll-mt-24 min-h-[50vh]">
                            <RenderValidator projectId={id} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-render" className="scroll-mt-24 min-h-[50vh]">
                            <VideoRenderer {...props} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-settings" className="scroll-mt-24 min-h-[50vh]">
                            <SettingsManager {...props} />
                        </section>

                        <div className="h-px bg-gray-100"></div>

                        <section id="section-logs" className="scroll-mt-24 min-h-[50vh]">
                            <LogViewer {...props} />
                        </section>

                    </div>
                </main>

            </div>
        </div>
    );
}

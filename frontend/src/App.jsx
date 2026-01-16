import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Layout, Video, Image as ImageIcon, MessageSquare,
  Settings, ChevronRight, ExternalLink, Download, FileText,
  Trash2, RefreshCw, Edit, Save, FileEdit, Volume2, Mic, FastForward,
  RotateCcw, Activity, Clock, FileAudio, CheckCircle, Sparkles,
  Folder, AlertCircle, ArrowLeft, FileVideo, HardDrive, ShieldCheck,
  Film, Sliders, Music, Play, Pause, Square, SkipBack, SkipForward, Maximize2,
  GripVertical, ChevronUp, ChevronDown,
  AlertTriangle, XCircle
} from 'lucide-react';

import { API_URL } from './config';
import RenderValidator from './components/RenderValidator';
import MusicManager from './components/MusicManager';
import VideoRenderer from './components/VideoRenderer';

// --- Components ---

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProductName, setNewProductName] = useState(''); // New state
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
    if (!newProjectId.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/projects/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: newProjectId,
          product_name: newProductName.trim() || null // Send optional name
        })
      });
      if (res.ok) {
        setNewProjectId('');
        setNewProductName('');
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
    <div className="max-w-4xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Easy Auto Video</h1>
      </header>

      {/* Create Project Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Create New Project</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              placeholder="Project ID (internal_id)"
              className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <input
              type="text"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Product Name (optional)"
              className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newProjectId}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {creating ? 'Creating...' : <><Plus size={20} /> Create Project</>}
          </button>
        </form>
      </div>

      {/* Project List */}
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
        <Folder size={24} className="text-blue-500" /> My Projects
      </h2>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No projects found. Start by creating one!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div key={p.project_id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex justify-between items-center group">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{p.project_id}</h3>
                <div className="text-sm text-blue-600 font-medium">{p.product_name || '-'}</div>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <AlertCircle size={14} /> Status: {p.status}
                  </span>
                  {p.last_updated && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> Updated: {new Date(p.last_updated).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/project/${p.project_id}`)}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded text-sm font-medium transition-opacity"
              >
                Open Project
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(''); // New state
  const [savingName, setSavingName] = useState(false);

  // Asset Loading
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const fetchAssets = () => {
    fetch(`${API_URL}/projects/${id}/assets`)
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        setLoadingAssets(false);
      })
      .catch(err => {
        console.error("Failed to load assets", err);
        setLoadingAssets(false);
      });
  };

  useEffect(() => {
    fetchAssets();
  }, [id, project?.last_updated]);

  // Fetch logic
  const loadProject = () => {
    fetch(`${API_URL}/projects`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(p => p.project_id === id);
        setProject(found);
        setEditingName(found?.product_name || '-'); // Sync edit state
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const res = await fetch(`${API_URL}/projects/${id}/update/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name: editingName })
      });
      if (res.ok) {
        loadProject();
      } else {
        alert("Failed to update product name");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating product name");
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading details...</div>;
  if (!project) return <div className="p-8 text-center text-red-500">Project not found</div>;

  const folders = [
    { name: 'input', icon: HardDrive, desc: 'Raw assets' },
    { name: 'script', icon: FileText, desc: 'Text scripts' },
    { name: 'audio', icon: FileAudio, desc: 'Generated audio' },
    { name: 'video', icon: FileVideo, desc: 'Final output' },
    { name: 'log', icon: AlertCircle, desc: 'Process logs' }
  ];


  return (
    <div className="max-w-4xl mx-auto pb-20">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>

      <header className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.project_id}</h1>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="text-lg text-blue-600 font-medium bg-blue-50/50 border border-blue-100 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none w-80"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || editingName === project.product_name}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <AlertCircle size={16} className="text-blue-500" />
                Status: <span className="font-medium text-gray-700">{project.status}</span>
              </span>
              <span className="flex items-center gap-2">
                <Clock size={16} />
                Created: {new Date(project.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <h2 className="text-xl font-semibold mb-4 text-gray-800">Project Workspace</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {folders.map(f => (
          <div key={f.name} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3 opacity-75 hover:opacity-100 transition-opacity cursor-default">
            <div className="p-2 bg-gray-100 rounded-md">
              <f.icon size={20} className="text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900 font-mono">/{f.name}</div>
              <div className="text-xs text-gray-500">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* URL Image Downloader Section */}
      <UrlImageDownloader
        projectId={id}
        onComplete={() => {
          fetchAssets();
          loadProject();
        }}
      />

      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center justify-between">
        <span>Input Assets</span>
        <span className="text-sm font-normal text-gray-500">{assets.length} images</span>
      </h2>

      {loadingAssets ? (
        <div className="py-8 text-center text-gray-400">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-10 text-center">
          <p className="text-gray-500">No images found in /input folder.</p>
          <p className="text-xs text-gray-400 mt-1">Place images manually into the folder to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {assets.map((asset) => (
            <div key={asset.name} className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                <img
                  src={`${API_URL}${asset.url}`}
                  alt={asset.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-1 px-2 text-[10px] text-gray-500 truncate bg-white border-t border-gray-100">
                {asset.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Section */}
      <PipelineManager project={project} onUpdate={loadProject} />

      {/* Script Section */}
      <ScriptEditor projectId={id} lastUpdated={project.last_updated} projectData={project} onUpdate={loadProject} />

      {/* Voice Section */}
      <VoiceManager projectId={id} lastUpdated={project.last_updated} projectData={project} onUpdate={loadProject} />

      {/* Music Section */}
      <MusicManager projectId={id} lastUpdated={project.last_updated} projectData={project} onUpdate={loadProject} />

      {/* Timeline Section */}
      <TimelineManager projectId={id} lastUpdated={project.last_updated} projectData={project} onUpdate={loadProject} />

      {/* Final Render Section */}
      <VideoRenderer projectId={id} lastUpdated={project.last_updated} projectData={project} onUpdate={loadProject} />

      {/* Log Viewer Section */}
      <LogViewer projectId={id} lastUpdated={project.last_updated} />

    </div>
  );
}

function TimelinePreview({ projectId, timeline, projectData }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(null);
  const imagesRef = useRef({});

  // Preload Images
  useEffect(() => {
    if (!timeline) return;
    timeline.segments.forEach(seg => {
      if (!imagesRef.current[seg.image]) {
        const img = new Image();
        img.src = `${API_URL}/media/${projectId}/input/${seg.image}`;
        imagesRef.current[seg.image] = img;
      }
    });
  }, [projectId, timeline]);

  // Audio Sync
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Main Loop
  useEffect(() => {
    let frameId;
    const render = () => {
      if (isPlaying) {
        setCurrentTime(prev => {
          const next = prev + 1 / 60; // 60 FPS assumption
          if (next >= timeline.total_duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }

      drawFrame();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, timeline, currentTime]);

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const seg = timeline.segments.find(s => currentTime >= s.start && currentTime < s.end) || timeline.segments[0];
    setCurrentSegment(seg);

    const img = imagesRef.current[seg.image];
    if (!img || !img.complete) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter';
      ctx.fillText(`Loading ${seg.image}...`, 20, 20);
      return;
    }

    // Effect Calculation
    const segElapsed = currentTime - seg.start;
    const progress = segElapsed / seg.duration;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    let scale = 1.1; // Baseline zoom for safety
    let tx = 0, ty = 0;

    if (seg.effect === 'zoom_in') scale = 1.1 + (progress * 0.2);
    if (seg.effect === 'zoom_out') scale = 1.3 - (progress * 0.2);
    if (seg.effect === 'pan_left') tx = (progress - 0.5) * 40;
    if (seg.effect === 'pan_right') tx = (0.5 - progress) * 40;

    // Center and draw
    const drawWidth = canvas.width * scale;
    const drawHeight = canvas.height * scale;
    const x = (canvas.width - drawWidth) / 2 + tx;
    const y = (canvas.height - drawHeight) / 2 + ty;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);
    ctx.restore();

    // Overlay info
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`${seg.image} | ${seg.effect} | ${(currentTime || 0).toFixed(2)}s / ${(timeline?.total_duration || 0).toFixed(2)}s`, 10, canvas.height - 10);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-4">
        {/* Preview Viewport */}
        <div className="lg:col-span-3 bg-black flex flex-col items-center justify-center p-4 min-h-[400px] relative group">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-auto max-w-2xl rounded shadow-2xl border border-gray-800"
          />
          <audio
            ref={audioRef}
            src={`${API_URL}/media/${projectId}/audio/voice.mp3?t=${new Date(projectData.last_updated).getTime()}`}
          />

          {/* Controls Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setCurrentTime(0)} className="text-white hover:text-blue-400 transition"><SkipBack size={20} /></button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button onClick={() => setIsPlaying(false)} className="text-white hover:text-red-400 transition"><Square size={20} /></button>
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="lg:col-span-1 bg-gray-800 p-6 border-l border-gray-700">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Maximize2 size={14} /> Inspector
          </h3>

          <div className="space-y-6">
            <div className="bg-gray-900/50 p-4 rounded-xl border border-white/5">
              <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Active Segment</label>
              <div className="text-white font-mono text-xs truncate mb-2">{currentSegment?.image || 'None'}</div>
              <div className="flex gap-2">
                <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase">{currentSegment?.effect || 'None'}</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-gray-700 text-gray-400 font-bold uppercase">{currentSegment?.duration.toFixed(2)}s</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Playback Progress</span>
                  <span className="text-xs font-mono text-blue-400 font-bold">{currentTime.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={timeline?.total_duration || 100}
                  step="0.01"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-tight">Sync Status: OK</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed italic">
                * This is a low-latency canvas simulation. Final video encoding will include high-quality motion interpolation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Timeline Ruler */}
      <div className="bg-gray-950 border-t border-gray-800">
        {/* Time Markers */}
        <div className="h-6 border-b border-gray-800 relative flex items-center px-2">
          {Array.from({ length: Math.ceil(timeline.total_audio_duration || timeline.total_duration || 10) + 1 }, (_, i) => {
            const totalDur = timeline.total_audio_duration || timeline.total_duration || 1;
            const position = (i / totalDur) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 flex flex-col items-center"
                style={{ left: `${position}%` }}
              >
                <div className="w-px h-2 bg-gray-600"></div>
                <span className="text-[8px] text-gray-500 font-mono mt-0.5">{i}s</span>
              </div>
            );
          })}
        </div>

        {/* Timeline Segments */}
        <div className="h-12 relative flex">
          {/* Leading Silence */}
          {timeline.silence_start_duration > 0 && (
            <div
              className="h-full bg-gray-800 border-r-2 border-dashed border-gray-700 flex items-center justify-center relative group/silence"
              style={{ width: `${(timeline.silence_start_duration / (timeline.total_audio_duration || timeline.total_duration || 1)) * 100}%` }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-50">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Silence</span>
              </div>
              <div className="absolute inset-0 bg-gray-700/0 group-hover/silence:bg-gray-700/30 transition-colors"></div>
            </div>
          )}

          {/* Image Segments */}
          {timeline.segments.map((seg, i) => {
            const totalDur = timeline.total_audio_duration || timeline.total_duration || 1;
            const width = (seg.duration / totalDur) * 100;
            const isActive = currentTime >= seg.start && currentTime < seg.end;
            const colors = {
              zoom_in: 'bg-blue-600/40 border-blue-500',
              zoom_out: 'bg-purple-600/40 border-purple-500',
              pan_left: 'bg-green-600/40 border-green-500',
              pan_right: 'bg-orange-600/40 border-orange-500',
              none: 'bg-gray-600/40 border-gray-500'
            };
            const color = colors[seg.effect] || colors.none;

            return (
              <div
                key={i}
                className={`h-full border-r border-gray-800 transition-all relative group/seg cursor-pointer ${isActive ? 'ring-2 ring-yellow-400 ring-inset' : ''
                  } ${color}`}
                style={{ width: `${width}%` }}
                onClick={() => setCurrentTime(seg.start)}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                  <span className="text-[8px] text-white font-bold opacity-70 group-hover/seg:opacity-100">
                    #{i + 1}
                  </span>
                  <span className="text-[7px] text-white/60 font-mono">
                    {seg.duration.toFixed(1)}s
                  </span>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover/seg:bg-white/10 transition-colors"></div>
              </div>
            );
          })}

          {/* Trailing Silence */}
          {timeline.silence_end_duration > 0 && (
            <div
              className="h-full bg-gray-800 border-l-2 border-dashed border-gray-700 flex items-center justify-center relative group/silence"
              style={{ width: `${(timeline.silence_end_duration / (timeline.total_audio_duration || timeline.total_duration || 1)) * 100}%` }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-50">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Silence</span>
              </div>
              <div className="absolute inset-0 bg-gray-700/0 group-hover/silence:bg-gray-700/30 transition-colors"></div>
            </div>
          )}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)] z-20 pointer-events-none"
            style={{ left: `${(currentTime / (timeline.total_audio_duration || timeline.total_duration || 1)) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full"></div>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="h-8 border-t border-gray-800 flex items-center justify-between px-3 text-[9px] text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-800 border border-dashed border-gray-600 rounded-sm"></div>
              Silence ({timeline.silence_start_duration || 0}s + {timeline.silence_end_duration || 0}s)
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-600/40 border border-blue-500 rounded-sm"></div>
              Images ({timeline.segments.length})
            </span>
          </div>
          <span className="font-mono font-bold text-gray-400">
            Total: {(timeline.total_audio_duration || timeline.total_duration || 0).toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelineEditor({ projectId, timeline, onUpdate }) {
  const [segments, setSegments] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectOptions = [
    { value: 'zoom_in', label: 'Zoom In', icon: '🔍+' },
    { value: 'zoom_out', label: 'Zoom Out', icon: '🔍-' },
    { value: 'pan_left', label: 'Pan ←', icon: '←' },
    { value: 'pan_right', label: 'Pan →', icon: '→' },
    { value: 'none', label: 'None', icon: '—' }
  ];

  useEffect(() => {
    if (timeline?.segments) {
      setSegments([...timeline.segments]);
      setHasChanges(false);
    }
  }, [timeline]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSegments = [...segments];
    const draggedItem = newSegments[draggedIndex];
    newSegments.splice(draggedIndex, 1);
    newSegments.splice(index, 0, draggedItem);

    setSegments(newSegments);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveSegment = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= segments.length) return;

    const newSegments = [...segments];
    [newSegments[index], newSegments[newIndex]] = [newSegments[newIndex], newSegments[index]];
    setSegments(newSegments);
    setHasChanges(true);
  };

  const updateEffect = (index, newEffect) => {
    const newSegments = [...segments];
    newSegments[index].effect = newEffect;
    setSegments(newSegments);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Recalculate timing based on new order
      const totalDuration = timeline.total_duration;
      const durationPerSegment = totalDuration / segments.length;

      const updatedSegments = segments.map((seg, idx) => ({
        ...seg,
        start: parseFloat((idx * durationPerSegment).toFixed(2)),
        end: parseFloat(((idx + 1) * durationPerSegment).toFixed(2)),
        duration: parseFloat(durationPerSegment.toFixed(2))
      }));

      const updatedTimeline = {
        ...timeline,
        segments: updatedSegments
      };

      const res = await fetch(`${API_URL}/projects/${projectId}/timeline/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTimeline)
      });

      if (res.ok) {
        setHasChanges(false);
        onUpdate();
      } else {
        alert('Failed to save timeline');
      }
    } catch (err) {
      alert('Error saving timeline');
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Edit size={12} /> Timeline Editor
        </h3>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? <RotateCcw size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="max-h-[450px] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="text-[9px] text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 w-8"></th>
              <th className="px-2 py-2 w-12">#</th>
              <th className="px-2 py-2">Image</th>
              <th className="px-2 py-2 w-24">Timing</th>
              <th className="px-2 py-2 w-32">Effect</th>
              <th className="px-2 py-2 w-16">Move</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {segments.map((seg, idx) => (
              <tr
                key={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group hover:bg-blue-50/50 transition-colors cursor-move ${draggedIndex === idx ? 'opacity-40 bg-blue-100' : ''
                  }`}
              >
                {/* Drag Handle */}
                <td className="px-2 py-2">
                  <GripVertical size={14} className="text-gray-300 group-hover:text-gray-500" />
                </td>

                {/* Order Number */}
                <td className="px-2 py-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-[10px] font-bold text-gray-600 group-hover:text-blue-600">
                    {idx + 1}
                  </div>
                </td>

                {/* Image + Name */}
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
                      <img
                        src={`${API_URL}/media/${projectId}/input/${seg.image}`}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                    <span className="text-[10px] font-mono text-gray-600 truncate max-w-[200px]">
                      {seg.image}
                    </span>
                  </div>
                </td>

                {/* Timing */}
                <td className="px-2 py-2">
                  <div className="text-[10px] font-mono text-gray-700">
                    {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                  </div>
                  <div className="text-[9px] text-gray-400">
                    {seg.duration.toFixed(1)}s
                  </div>
                </td>

                {/* Effect Selector */}
                <td className="px-2 py-2">
                  <select
                    value={seg.effect}
                    onChange={(e) => updateEffect(idx, e.target.value)}
                    className="w-full px-2 py-1 text-[10px] font-medium border border-gray-200 rounded bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    {effectOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Move Buttons */}
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveSegment(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition"
                      title="Move Up"
                    >
                      <ChevronUp size={12} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => moveSegment(idx, 'down')}
                      disabled={idx === segments.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition"
                      title="Move Down"
                    >
                      <ChevronDown size={12} className="text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasChanges && (
        <div className="px-3 py-2 bg-yellow-50 border-t border-yellow-200 flex items-center justify-center gap-2">
          <AlertCircle size={14} className="text-yellow-600" />
          <p className="text-[10px] text-yellow-800 font-medium">
            Unsaved changes - Click "Save" to apply
          </p>
        </div>
      )}
    </div>
  );
}





function TimelineManager({ projectId, lastUpdated, projectData, onUpdate }) {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data);
      } else {
        setTimeline(null);
      }
    } catch (err) {
      console.error("Failed to fetch timeline", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [projectId, lastUpdated]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/timeline/generate`, { method: 'POST' });
      if (res.ok) {
        await fetchTimeline();
        onUpdate();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to generate timeline");
      }
    } catch (err) {
      alert("Error generating timeline");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Film size={24} className="text-gray-500" /> Timeline Management
        </h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50 transition shadow-lg"
        >
          {generating ? <RotateCcw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {timeline ? 'REGENERATE TIMELINE' : 'GENERATE INITIAL TIMELINE'}
        </button>
      </div>

      {timeline && (
        <TimelinePreview
          projectId={projectId}
          timeline={timeline}
          projectData={projectData}
        />
      )}

      {!timeline ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-2">No timeline generated yet.</p>
          <p className="text-xs text-gray-400">Timeline synchronizes your images with the voice duration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sliders size={14} /> Global Config
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Duration</span>
                  <span className="text-sm font-bold text-blue-600">{timeline.total_duration}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Segments</span>
                  <span className="text-sm font-bold text-gray-800">{timeline.segments?.length} images</span>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <Music size={12} /> Background Music
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">File</span>
                      <span className="font-mono font-bold text-gray-700">{timeline.audio?.bgm?.file || 'None'}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Volume</span>
                      <span className="font-bold text-gray-700">{(timeline.audio?.bgm?.volume * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Ducking</span>
                      <span className={`font-bold ${timeline.audio?.bgm?.ducking ? 'text-green-600' : 'text-gray-400'}`}>
                        {timeline.audio?.bgm?.ducking ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Segments Editor */}
          <div className="lg:col-span-2">
            <TimelineEditor
              projectId={projectId}
              timeline={timeline}
              onUpdate={fetchTimeline}
            />
          </div>
        </div>
      )}

      {/* Render Validation */}
      <RenderValidator projectId={projectId} />
    </div>
  );
}

function VoiceManager({ projectId, lastUpdated, projectData, onUpdate }) {
  const [profiles, setProfiles] = useState([]);
  const [voiceFiles, setVoiceFiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [speed, setSpeed] = useState(1.0);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [profRes, fileRes] = await Promise.all([
        fetch(`${API_URL}/voice/profiles`),
        fetch(`${API_URL}/projects/${projectId}/voice/files`)
      ]);
      const profs = await profRes.json();
      const files = await fileRes.json();
      setProfiles(profs);
      setVoiceFiles(files);
      if (profs.length > 0 && !selectedProfile) {
        // Try to find OpenAI Echo first, otherwise use the first profile
        const defaultProf = profs.find(p => p.id === 'oa_echo') || profs[0];
        setSelectedProfile(defaultProf.id);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch voice data", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, lastUpdated]);

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      // 1. Fetch current script text to ensure latest version
      const scriptRes = await fetch(`${API_URL}/projects/${projectId}/script`);
      const scriptData = await scriptRes.json();
      const scriptText = scriptData.content;

      // 2. Resolve Profile
      const profile = profiles.find(p => p.id === selectedProfile);
      if (!profile) {
        console.error("Profile resolution failed for", selectedProfile);
        alert("Invalid voice profile selected.");
        setGenerating(false);
        return;
      }

      // 3. Validation Guardrails
      if (!scriptText || scriptText.trim().length < 5) {
        alert("Script is too short or empty. Please write more content before generating voice.");
        setGenerating(false);
        return;
      }

      // 4. Construct Rich Payload
      const payload = {
        profile_id: selectedProfile,
        text: scriptText,
        provider: profile.service,
        voice: profile.voice || profile.lang || 'th',
        speed: parseFloat(speed)
      };

      console.log("FINAL TTS PAYLOAD", payload);

      // 5. API Call
      const res = await fetch(`${API_URL}/projects/${projectId}/voice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchData();
        onUpdate();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || "Failed to generate voice"}`);
      }
    } catch (err) {
      console.error("TTS Execution Error:", err);
      alert("Critical error during voice generation. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/voice/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        onUpdate();
      }
    } catch (err) { alert("Delete failed"); }
  };

  const handleActivate = async (filename) => {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/voice/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        await fetchData();
        onUpdate();
      }
    } catch (err) { alert("Activation failed"); }
  };

  if (loading) return null;

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Mic size={24} className="text-gray-500" /> Voice Management
        </h2>
        <div className="flex items-center gap-2 text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold uppercase tracking-wide">
          <Sparkles size={12} /> Premium Voices Ready
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Voice Control */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity size={14} /> Profile & Speed
          </h3>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfile(p.id)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition ${selectedProfile === p.id ? 'border-blue-500 bg-blue-50/50 shadow-md ring-4 ring-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${p.service === 'openai' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                        {p.service}
                      </span>
                      {p.preview && (
                        <button
                          onClick={(e) => { e.stopPropagation(); new Audio(`${API_URL}${p.preview}`).play(); }}
                          className="p-1.5 bg-white text-blue-500 rounded-full shadow-sm hover:scale-110 transition active:scale-95"
                        >
                          <Volume2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="font-bold text-gray-800 text-sm mt-1">{p.name}</div>
                    <div className="text-[10px] text-gray-500 font-medium italic">{p.tone}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <label className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-tight">
                <span>Speech Speed Control</span>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">{speed}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full h-2 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-inner"
              />
              <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-2 uppercase">
                <span>Slow / 0.5x</span>
                <span>Normal / 1.0x</span>
                <span>Fast / 2.0x</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-gray-200 transition-all active:scale-[0.98]"
            >
              {generating ? <RotateCcw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
              {generating ? 'GENERATING...' : 'GENERATE / REGENERATE VOICE'}
            </button>
          </div>
        </div>

        {/* Generated Files */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 border-dashed">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <FileAudio size={14} /> Voice Library Variants
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {voiceFiles.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm italic">
                <Mic className="mx-auto mb-2 opacity-20" size={48} />
                No voice variants generated.
              </div>
            ) : (
              voiceFiles.map((file, idx) => (
                <div
                  key={idx}
                  className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${file.filename === 'voice.mp3' ? 'border-green-300 ring-2 ring-green-50' : 'border-gray-100'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${file.filename === 'voice.mp3' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500'}`}>
                        {file.filename === 'voice.mp3' ? <CheckCircle size={18} /> : <FileAudio size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold text-gray-800">{file.filename}</div>
                          {file.filename === 'voice.mp3' && <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                          {file.label ? <span className="text-blue-600 font-bold">{file.label}</span> :
                            <span className="flex items-center gap-2 font-medium"><Mic size={8} /> {file.profile_id} • {file.speed}x</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {file.filename !== 'voice.mp3' && file.filename !== 'voice_processed.mp3' && (
                        <>
                          <button
                            onClick={() => handleActivate(file.filename)}
                            className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition border border-blue-100"
                          >
                            Set Active
                          </button>
                          <button
                            onClick={() => handleDelete(file.filename)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <audio controls className="h-8 flex-1" src={`${API_URL}${file.url}?t=${new Date(projectData.last_updated).getTime()}`}>
                      Your browser does not support the audio element.
                    </audio>
                    <div className="text-right whitespace-nowrap">
                      {file.duration && <div className="text-[11px] font-bold text-gray-700">{file.duration}s</div>}
                      {file.timestamp && (
                        <div className="text-[9px] text-gray-400">
                          {new Date(parseInt(file.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




function ScriptEditor({ projectId, lastUpdated, projectData, onUpdate }) {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchScript = () => {
    fetch(`${API_URL}/projects/${projectId}/script`)
      .then(res => res.json())
      .then(data => {
        setContent(data.content);
        setWordCount(data.word_count);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch script", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScript();
  }, [projectId, lastUpdated]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const data = await res.json();
        setWordCount(data.word_count);
        setIsEditing(false);
        onUpdate(); // Refresh project metadata
      } else {
        alert("Failed to save script");
      }
    } catch (err) {
      alert("Error saving script");
    } finally {
      setSaving(false);
    }
  };

  const status = projectData.pipeline?.script_gen?.status || 'PENDING';

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <FileText size={24} className="text-gray-500" /> Video Script
        </h2>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${status === 'MANUAL_EDIT' ? 'bg-orange-50 text-orange-600 border-orange-200' :
            status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
              'bg-gray-50 text-gray-500 border-gray-200'
            }`}>
            {status === 'completed' ? 'Auto-Generated' : status === 'MANUAL_EDIT' ? 'Modified' : status}
          </span>
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{wordCount} words (est. {Math.round(wordCount * 0.5)}s)</span>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200 transition"
            >
              <FileEdit size={14} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-3 py-1.5 text-gray-500 text-xs font-bold rounded hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition shadow-sm"
              >
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`bg-white rounded-lg border-2 transition-all ${isEditing ? 'border-indigo-300 shadow-lg ring-4 ring-indigo-50' : 'border-gray-200 shadow-sm'}`}>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading script...</div>
        ) : isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-6 text-lg font-medium text-gray-800 outline-none min-h-[200px] leading-relaxed resize-none"
            placeholder="Write your video script here..."
            autoFocus
          />
        ) : (
          <div className="p-6 text-lg font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
            {content || <span className="italic text-gray-400 text-base">No script generated yet. Use the Pipeline Control to generate one.</span>}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-gray-400 italic">
        * Word count is estimated as Thai characters divided by 4. Target for 15s is ~30 words.
      </p>
    </div>
  );
}

function PipelineManager({ project, onUpdate }) {
  const [dynamicSteps, setDynamicSteps] = useState([]);
  const [isRunningAuto, setIsRunningAuto] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/pipeline/steps`)
      .then(res => res.json())
      .then(data => setDynamicSteps(data))
      .catch(err => console.error("Failed to fetch steps", err));
  }, []);

  const statuses = project.pipeline || {};
  const disabledSteps = project.config?.disabled_steps || [];

  const handleToggleStep = async (stepId, currentDisabled) => {
    const newDisabled = currentDisabled
      ? disabledSteps.filter(id => id !== stepId)
      : [...disabledSteps, stepId];

    try {
      const res = await fetch(`${API_URL}/projects/${project.project_id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled_steps: newDisabled })
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRun = async (stepId) => {
    try {
      const res = await fetch(`${API_URL}/projects/${project.project_id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_name: stepId })
      });
      if (res.ok) onUpdate();
      else alert("Failed to run step");
    } catch (err) {
      alert("Error running step");
    }
  };

  const handleAutoRun = async () => {
    setIsRunningAuto(true);
    try {
      const res = await fetch(`${API_URL}/projects/${project.project_id}/run/auto`, {
        method: 'POST'
      });
      if (res.ok) onUpdate();
      else alert("Auto-run failed or stopped early");
    } catch (err) {
      alert("Error starting auto-run");
    } finally {
      setIsRunningAuto(false);
    }
  };

  const handleRetry = async (stepId) => {
    try {
      const resetRes = await fetch(`${API_URL}/projects/${project.project_id}/reset-step/${stepId}`, {
        method: 'POST'
      });
      if (resetRes.ok) {
        handleAutoRun();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (id) => {
    if (id.includes('validate')) return ShieldCheck;
    if (id.includes('script')) return FileText;
    if (id.includes('tts')) return FileAudio;
    if (id.includes('image')) return ImageIcon;
    if (id.includes('video') || id.includes('stitch')) return FileVideo;
    return Activity;
  };

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Clock size={24} className="text-gray-500" /> Pipeline Control
        </h2>
        <button
          onClick={handleAutoRun}
          disabled={isRunningAuto}
          className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition ${isRunningAuto ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
            }`}
        >
          {isRunningAuto ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-600"></div>
              Running...
            </>
          ) : (
            <>
              <Play size={18} /> Run Auto Pipeline
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden">
        {dynamicSteps.map(step => {
          const stepData = statuses[step.id] || {};
          const status = stepData.status || 'pending';
          const isDisabled = disabledSteps.includes(step.id);
          const icon = getIcon(step.id);
          const error = stepData.error;

          return (
            <div key={step.id} className={`p-4 flex flex-col gap-3 transition-colors ${isDisabled ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={!isDisabled}
                    disabled={isRunningAuto}
                    onChange={() => handleToggleStep(step.id, isDisabled)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    title={isDisabled ? "Enable step" : "Disable step"}
                  />

                  <div className={`p-2 rounded-full ${status === 'completed' ? 'bg-green-100 text-green-600' :
                    status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {React.createElement(icon, { size: 20 })}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {step.label}
                      {isDisabled && <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase">Disabled</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      STATUS: <span className={`uppercase font-semibold ${status === 'failed' ? 'text-red-500' : ''}`}>{status}</span>
                      {stepData.updated_at && ` • ${new Date(stepData.updated_at).toLocaleTimeString()}`}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isDisabled && status === 'failed' && error?.recoverable && (
                    <button
                      onClick={() => handleRetry(step.id)}
                      disabled={isRunningAuto}
                      className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded hover:bg-orange-200 transition flex items-center gap-1"
                    >
                      <RotateCcw size={14} /> Retry
                    </button>
                  )}
                  {!isDisabled && (
                    <button
                      onClick={() => handleRun(step.id)}
                      disabled={isRunningAuto}
                      className={`px-4 py-1.5 text-xs font-bold rounded transition border ${status === 'completed'
                        ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        } ${isRunningAuto ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {status === 'completed' ? 'Re-run' : 'Run Now'}
                    </button>
                  )}
                </div>
              </div>

              {!isDisabled && status === 'failed' && error && (
                <div className="ml-14 p-2 bg-red-50 border border-red-100 rounded text-[11px] text-red-700">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <AlertCircle size={14} /> {error.code}: {error.message_th || error.message}
                  </div>
                  {error.message_th && error.message && (
                    <div className="opacity-70 font-normal italic">{error.message}</div>
                  )}
                  {error.detail && <div className="mt-1 font-mono bg-white/50 p-1 rounded border border-red-200/50">{error.detail}</div>}
                  {!error.recoverable && (
                    <div className="mt-2 text-[10px] font-black uppercase text-red-900 bg-red-200/50 px-2 py-0.5 rounded w-fit">
                      Manual Fix Required / ต้องแก้ไขด้วยตัวเอง
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogViewer({ projectId, lastUpdated }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, INFO, ERROR

  useEffect(() => {
    fetch(`${API_URL}/projects/${projectId}/logs`)
      .then(res => res.json())
      .then(data => {
        setLogs(data.lines || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load logs", err);
        setLoading(false);
      });
  }, [projectId, lastUpdated]);

  const filteredLogs = logs.filter(line => {
    if (filter === 'ALL') return true;
    return line.toUpperCase().includes(filter);
  });

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <FileText size={24} className="text-gray-500" /> System Logs
        </h2>
        <div className="flex gap-4 items-center">
          <a
            href={`${API_URL}/projects/${projectId}/logs/download`}
            download
            className="flex items-center gap-1.5 px-3 py-1 bg-white text-gray-700 text-sm font-bold rounded-md border border-gray-300 hover:bg-gray-50 transition shadow-sm"
          >
            <Download size={14} /> Download Full Log
          </a>
          <div className="flex gap-2 text-sm">
            {['ALL', 'INFO', 'ERROR'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md border ${filter === f
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 h-64 overflow-y-auto shadow-inner">
        {loading ? (
          <div className="text-center py-10 opacity-50">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            {logs.length === 0 ? 'No log files found.' : 'No logs match filter.'}
          </div>
        ) : (
          filteredLogs.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap py-0.5 ${line.includes('ERROR') ? 'text-red-400' :
              line.includes('WARNING') ? 'text-yellow-400' : 'text-gray-300'
              }`}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-12">
      <h3 className="text-lg font-semibold mb-2 text-gray-800 flex items-center gap-2">
        <Download size={20} className="text-gray-500" /> Download Images via URL
      </h3>
      <p className="text-sm text-gray-500 mb-4">Paste image URLs (one per line). Supported: JPG, PNG, WEBP.</p>

      <textarea
        value={urlList}
        onChange={(e) => setUrlList(e.target.value)}
        placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
        className="w-full h-48 p-3 border rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4 resize-y"
        disabled={downloading}
      />

      <button
        onClick={handleDownload}
        disabled={downloading || !urlList.trim()}
        className="w-full py-2 bg-gray-800 text-white rounded-md hover:bg-black transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
      >
        {downloading ? 'Downloading...' : 'Start Download'}
      </button>

      {results && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Results:</h4>
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i} className="text-xs flex items-center gap-2">
                {r.success ? (
                  <span className="text-green-600">✓ Success: {r.filename}</span>
                ) : (
                  <span className="text-red-500">✗ Failed: {r.error}</span>
                )}
                <span className="text-gray-400 truncate flex-1">{r.url}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- Main App ---

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </div>
  );
}

export default App;

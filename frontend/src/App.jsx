import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Folder, Clock, AlertCircle, ArrowLeft, FileVideo, FileAudio, FileText, HardDrive } from 'lucide-react';

const API_URL = 'http://localhost:8000';

// --- Components ---

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectId, setNewProjectId] = useState('');
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
        body: JSON.stringify({ project_id: newProjectId })
      });
      if (res.ok) {
        setNewProjectId('');
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
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            value={newProjectId}
            onChange={(e) => setNewProjectId(e.target.value)}
            placeholder="Enter project ID (e.g., my_video_01)"
            className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={creating || !newProjectId}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
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
                <div className="flex gap-4 mt-1 text-sm text-gray-500">
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

  // Fetch all projects and find the matching one (Constraint: No backend change)
  useEffect(() => {
    fetch(`${API_URL}/projects`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(p => p.project_id === id);
        setProject(found);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
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
    <div className="max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>

      <header className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.project_id}</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {folders.map(f => (
          <div key={f.name} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3 opacity-75">
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

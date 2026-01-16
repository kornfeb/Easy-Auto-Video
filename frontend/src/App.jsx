import React, { useState, useEffect } from 'react';
import { Plus, Folder, Clock, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectId, setNewProjectId] = useState('');
  const [creating, setCreating] = useState(false);

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
    <div className="min-h-screen bg-gray-50 p-8">
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
                <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Project
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

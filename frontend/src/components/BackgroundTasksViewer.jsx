import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { CloudDownload, CheckCircle, Loader2, AlertCircle, X } from 'lucide-react';

export default function BackgroundTasksViewer() {
    const [tasks, setTasks] = useState({});
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await fetch(`${API_URL}/api/tasks/background`);
                const data = await res.json();
                setTasks(data);

                // Show automatically if there are downloading tasks
                const hasActive = Object.values(data).some(t => t.status === 'downloading');
                if (hasActive) setIsVisible(true);
            } catch (err) {
                console.error("Failed to fetch bg tasks", err);
            }
        };

        const interval = setInterval(fetchTasks, 2000);
        fetchTasks();
        return () => clearInterval(interval);
    }, []);

    const taskList = Object.values(tasks).sort((a, b) =>
        new Date(b.started_at) - new Date(a.started_at)
    );

    if (taskList.length === 0) return null;

    if (!isVisible) {
        const activeCount = taskList.filter(t => t.status === 'downloading').length;
        if (activeCount === 0) return null;

        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 animate-bounce hover:animate-none group transition-all z-[60]"
            >
                <CloudDownload size={24} />
                <span className="font-bold text-sm pr-2">{activeCount} Syncing...</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[60] flex flex-col max-h-[400px]">
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CloudDownload size={18} className="text-blue-400" />
                    <span className="text-sm font-bold">Background Sync</span>
                </div>
                <button onClick={() => setIsVisible(false)} className="p-1 hover:bg-white/10 rounded-lg">
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {taskList.map((task, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-mono text-gray-500 truncate w-40" title={task.project_id}>
                                {task.project_id}
                            </span>
                            {task.status === 'downloading' ? (
                                <Loader2 size={14} className="animate-spin text-blue-500" />
                            ) : task.status === 'completed' ? (
                                <CheckCircle size={14} className="text-green-500" />
                            ) : (
                                <AlertCircle size={14} className="text-red-500" />
                            )}
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="flex-1 mr-4">
                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${(task.completed / task.total) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                    {task.completed} / {task.total} Images
                                </p>
                            </div>
                            <span className="text-[10px] font-black text-gray-600">
                                {Math.round((task.completed / task.total) * 100)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

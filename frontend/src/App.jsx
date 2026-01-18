import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ProjectLayout from './components/ProjectLayout';
import TestSandbox from './TestSandbox';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectLayout />} />
        <Route path="/sandbox/image-editor" element={<TestSandbox />} />
      </Routes>
    </div>
  );
}

export default App;

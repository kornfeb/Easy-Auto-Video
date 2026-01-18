import React, { useState, useEffect } from 'react';
import ImageProcessor from './components/steps/ImageProcessor';
import { API_URL } from './config';

export default function TestCropPage() {
    const projectId = "TEST_CROP";
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAssets = () => {
        fetch(`${API_URL}/projects/${projectId}/assets`)
            .then(res => res.json())
            .then(data => {
                setAssets(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load assets", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    return (
        <div className="p-10 max-w-5xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-8">Crop Tool Sandbox</h1>

            {loading ? (
                <p>Loading test assets...</p>
            ) : (
                <div className="space-y-10">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold mb-4 italic text-gray-400">Original / Current Image</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {assets.map(asset => (
                                <div key={asset.name} className="space-y-2">
                                    <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300">
                                        <img
                                            src={`${API_URL}${asset.url}?t=${Date.now()}`}
                                            className="w-full h-full object-contain"
                                            alt="Test"
                                        />
                                    </div>
                                    <p className="text-sm font-mono text-gray-500 text-center">{asset.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-10">
                        <h2 className="text-xl font-bold mb-6">Test Interactive Processor</h2>
                        <div className="h-[700px] border rounded-3xl overflow-hidden shadow-2xl">
                            <ImageProcessor
                                projectId={projectId}
                                assets={assets}
                                initialSelection={assets.length > 0 ? [assets[0].name] : []}
                                onUpdate={() => {
                                    console.log("Assets updated!");
                                    fetchAssets();
                                }}
                                onClose={() => alert("Close clicked")}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

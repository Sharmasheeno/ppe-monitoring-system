import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, Image as ImageIcon, TestTube, CheckCircle, AlertTriangle, Play, ShieldAlert, FileWarning, Sparkles } from 'lucide-react';

export default function AISandbox() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [resultData, setResultData] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResultData(null); // Reset previous results
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            setFile(droppedFile);
            setPreview(URL.createObjectURL(droppedFile));
            setResultData(null);
        }
    };

    const processImage = async () => {
        if (!file) return;
        setIsAnalyzing(true);
        setResultData(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Note: pointing to AI engine port 5001 instead of backend 5000
            const res = await axios.post('http://localhost:5002/api/sandbox', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setResultData(res.data);
            setPreview(res.data.image); // Replace preview with annotated image
        } catch (err) {
            console.error("AI processing failed", err);
            alert(err.message || 'Make sure the AI Engine (Python) is running on port 5001.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <TestTube className="text-brand-500" /> Live AI Sandbox
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    Upload any construction photo to test the custom YOLOv8 model in real-time.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Upload Section */}
                <div className="lg:col-span-1 space-y-4">
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className={`bg-white border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer h-72
                            ${preview ? 'border-brand-300 bg-brand-50/30' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${preview ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                            {preview ? <CheckCircle size={32} /> : <UploadCloud size={32} />}
                        </div>
                        <h3 className="font-bold text-gray-700 text-lg">
                            {preview ? "Image Selected" : "Upload Test Image"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Drag & drop or click to browse
                        </p>
                        {file && (
                            <div className="mt-4 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm text-xs font-mono text-gray-600 max-w-full truncate">
                                {file.name}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={processImage}
                        disabled={!file || isAnalyzing}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                            ${!file ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 
                              isAnalyzing ? 'bg-brand-500/80 text-white cursor-wait' : 
                              'bg-brand-600 hover:bg-brand-700 text-white transform hover:-translate-y-1 hover:shadow-brand-500/30'}`}
                    >
                        {isAnalyzing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing Image...
                            </>
                        ) : (
                            <>
                                <Play size={18} />
                                Run AI Inference
                            </>
                        )}
                    </button>
                    
                    {/* Instructions Card for Panel */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                        <p className="font-bold mb-1 flex items-center gap-1.5"><Sparkles size={16}/> How this works</p>
                        This sandbox directly hooks into the Python Edge Node (`http://localhost:5002`). It transmits the image, processes it through exactly the same custom YOLO logic used for the cameras, and returns the bounding boxes.
                    </div>
                </div>

                {/* Viewport & Results Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-black rounded-2xl shadow-xl overflow-hidden min-h-[400px] flex items-center justify-center border border-gray-800 relative group">
                        {!preview ? (
                            <div className="text-gray-600 flex flex-col items-center">
                                <ImageIcon size={48} className="mb-3 opacity-50" />
                                <p className="font-medium tracking-wide">AWAITING IMAGE INPUT</p>
                            </div>
                        ) : (
                            <>
                                <img 
                                    src={preview} 
                                    alt="Test Target" 
                                    className="max-w-full max-h-[300px] object-contain transition-opacity duration-300 isolate" 
                                />
                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                        <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden relative">
                                            <div className="absolute top-0 left-0 h-full bg-green-500 animate-[scan_1.5s_ease-in-out_infinite]" style={{ width: '30%' }}></div>
                                        </div>
                                        <p className="text-green-400 font-mono mt-4 text-sm animate-pulse">Running YOLOv8 architecture...</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Results Panel */}
                    {resultData && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
                                AI Inference Results
                                <span className={`text-xs font-mono px-3 py-1 rounded-full ${resultData.status?.includes('VIOLATION') ? 'bg-red-100 text-red-700' : resultData.status?.includes('COMPLIANT') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {resultData.status ? (resultData.status.includes('VIOLATION') ? 'VIOLATION FOUND' : 'COMPLIANT') : 'Status: Unknown'}
                                </span>
                            </h3>

                            {/* Always prominently display the exact logical status sent by the AI Engine */}
                            <div className={`mb-6 p-4 rounded-xl border-l-4 ${resultData.status?.includes('VIOLATION') ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
                                <h4 className={`font-black text-lg ${resultData.status?.includes('VIOLATION') ? 'text-red-700' : 'text-green-700'}`}>
                                    AI Logical Assessment:
                                </h4>
                                <p className={`mt-1 font-medium ${resultData.status?.includes('VIOLATION') ? 'text-red-600' : 'text-green-600'}`}>
                                    {resultData.status}
                                </p>
                            </div>
                            
                            {resultData.detections.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                                    <FileWarning size={32} className="mb-2 text-gray-400" />
                                    <p>No isolated safety items detected by the model.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {resultData.detections.map((det, index) => (
                                        <div key={index} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col relative overflow-hidden">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${det.class === 'Glove' ? 'bg-yellow-400' : det.class === 'Vest' ? 'bg-orange-500' : 'bg-green-500'}`} />
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Detected Object</span>
                                            <span className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                {det.class === 'Glove' ? 'Safety Gloves' : det.class}
                                            </span>
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-500">Confidence Model: YOLO</span>
                                                <span className="text-sm font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                                                    {(det.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
            </div>
            {/* Custom keyframes for the scanner line */}
            <style jsx="true">{`
                @keyframes scan {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(250%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}

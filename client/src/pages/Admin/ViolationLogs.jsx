import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Camera, CheckCircle, Search, Filter, User } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

function ViolationLogs() {
    const { searchTerm = '' } = useOutletContext() || {};
    const [violations, setViolations] = useState([]);
    const [users, setUsers] = useState([]);
    const [localStatuses, setLocalStatuses] = useState({});
    const [statusFilter, setStatusFilter] = useState('All');
    const [workerFilter, setWorkerFilter] = useState('All');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const fetchAll = async () => {
            try {
                const [vRes, uRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/violations', { headers }),
                    axios.get('http://localhost:5001/api/users', { headers }),
                ]);
                setViolations(vRes.data || []);
                setUsers((uRes.data || []).filter(u => u.role === 'user' && u.workerId));
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    const workerNameById = useMemo(() => {
        const m = {};
        users.forEach(u => { m[u.workerId] = u.username; });
        return m;
    }, [users]);

    const toggleStatus = async (v) => {
        const id = v._id;
        const current = localStatuses[id] || v.status || 'Pending Review';
        let next = 'Resolved';
        if (current === 'Pending Review') next = 'Resolved';
        else if (current === 'Resolved') next = 'False Flag';
        else next = 'Pending Review';
        
        setLocalStatuses(prev => ({ ...prev, [id]: next }));
        
        try {
            await axios.patch(`http://localhost:5001/api/violations/${id}/status`, { status: next });
        } catch(err) {
            console.error('Failed to update status', err);
        }
    };

    const renderStatusBadge = (v) => {
        const status = localStatuses[v._id] || v.status || 'Pending Review';
        if (status === 'Resolved') {
             return (
                 <span onClick={() => toggleStatus(v)} className="inline-flex cursor-pointer select-none items-center px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                     Resolved
                 </span>
             );
        } else if (status === 'False Flag') {
             return (
                 <span onClick={() => toggleStatus(v)} className="inline-flex cursor-pointer select-none items-center px-3 py-1 rounded-md text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
                     <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                     False Flag
                 </span>
             );
        }
        return (
             <span onClick={() => toggleStatus(v)} className="inline-flex cursor-pointer select-none items-center px-3 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                 Pending Review
             </span>
        );
    };

    const filteredViolations = violations.filter(v => {
        const workerName = workerNameById[v.workerId] || '';
        const textMatches = (v.violationType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (v.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (v._id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            workerName.toLowerCase().includes(searchTerm.toLowerCase());
        const status = localStatuses[v._id] || v.status || 'Pending Review';
        const statusMatches = statusFilter === 'All' || status === statusFilter;
        const workerMatches = workerFilter === 'All' || v.workerId === workerFilter;
        return textMatches && statusMatches && workerMatches;
    });

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Violation History Logs</h2>
                    <p className="text-gray-500 text-sm mt-1">Complete immutable record of all safety compliance violations.</p>
                </div>
                <div className="flex gap-3 text-sm">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User size={16} className="text-gray-500" />
                        </div>
                        <select
                            value={workerFilter}
                            onChange={(e) => setWorkerFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 pl-9 pr-8 py-2 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors font-medium appearance-none cursor-pointer"
                        >
                            <option value="All">All Workers</option>
                            {users.map(u => (
                                <option key={u._id} value={u.workerId}>
                                    {u.username} ({u.workerId})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter size={16} className="text-gray-500" />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 pl-9 pr-8 py-2 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors font-medium appearance-none cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending Review">Pending Review</option>
                            <option value="Resolved">Resolved</option>
                            <option value="False Flag">False Flag</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                <th className="px-6 py-4 font-semibold">Violation Snapshot</th>
                                <th className="px-6 py-4 font-semibold">Location</th>
                                <th className="px-6 py-4 font-semibold">Confidence Score</th>
                                <th className="px-6 py-4 font-semibold">Time Logged</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">Loading logs...</td>
                                </tr>
                            ) : filteredViolations.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <CheckCircle size={32} className="text-emerald-400 mb-2" />
                                            <p className="font-medium text-gray-600">No logs found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredViolations.map((v, idx) => (
                                    <tr key={v._id || idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                                    {v.imageUrl ? (
                                                        <img 
                                                            src={v.imageUrl} 
                                                            alt="AI Bounding Box" 
                                                            className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" 
                                                            onClick={() => setSelectedImage(v.imageUrl)}
                                                            title="Click to expand snapshot" 
                                                        />
                                                    ) : (
                                                        <div className="text-gray-400 flex flex-col items-center">
                                                            <Camera size={18} className="mb-1" />
                                                            <span className="text-[9px] uppercase tracking-wider">No Image</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-base ${v.violationType === 'Safety Verified' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {v.violationType}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                                        {workerNameById[v.workerId] || 'Unassigned'}
                                                        <span className="text-gray-400 ml-1">· {v.workerId || 'no-id'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center font-medium text-gray-700">
                                                {v.location || 'Construction Zone Alpha'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full ${v.violationType === 'Safety Verified' ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${(v.confidence * 100)}%` }}></div>
                                                </div>
                                                <span className="font-bold text-gray-700">{(v.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                                            {new Date(v.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {renderStatusBadge(v)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img 
                            src={selectedImage} 
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-gray-700" 
                            alt="Expanded Violation"
                        />
                        <button 
                            onClick={() => setSelectedImage(null)} 
                            className="absolute -top-4 -right-4 md:top-4 md:right-4 bg-red-600 hover:bg-red-700 transition-colors rounded-full p-2 text-white shadow-lg border border-red-500"
                        >
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ViolationLogs;

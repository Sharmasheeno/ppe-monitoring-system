import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Filter, Camera, ShieldAlert, CheckCircle, Activity, User, Shield, CalendarIcon } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

function UserTracking() {
    const { searchTerm = '' } = useOutletContext() || {};
    const [users, setUsers] = useState([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [workerData, setWorkerData] = useState(null);
    const [violations, setViolations] = useState([]);
    const [stats, setStats] = useState({ total: 0, resolved: 0, score: 100 });
    const [statusFilter, setStatusFilter] = useState('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Fetch all users to populate the dropdown
        const fetchUsers = async () => {
            try {
                const res = await axios.get('http://localhost:5001/api/users', {
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });
                const workers = res.data.filter(u => u.role === 'user');
                setUsers(workers);
                // Select first worker by default if available
                if (workers.length > 0) {
                    setSelectedWorkerId(workers[0].workerId);
                }
            } catch (err) {
                console.error('Failed to fetch users', err);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!selectedWorkerId) return;

        const fetchWorkerData = async () => {
            setIsLoading(true);
            try {
                // Find worker details
                const worker = users.find(u => u.workerId === selectedWorkerId);
                setWorkerData(worker);

                // Fetch real historic violations for this specific worker
                const res = await axios.get(`http://localhost:5001/api/violations/worker/${selectedWorkerId}`, {
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });
                // Backend now returns { violations: [recent], total, resolved }.
                // Stay backward-compatible with the old array-only shape.
                const data = res.data;
                const list = Array.isArray(data) ? data : (data.violations || []);
                setViolations(list);
                const recentUnresolved = list.filter(v => v.status !== 'Resolved' &&
                    new Date(v.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
                setStats({
                    total: Array.isArray(data) ? data.length : (data.total ?? list.length),
                    resolved: Array.isArray(data)
                        ? data.filter(v => v.status === 'Resolved').length
                        : (data.resolved ?? 0),
                    score: (!Array.isArray(data) && data.score !== undefined)
                        ? data.score
                        : Math.max(0, 100 - recentUnresolved * 5),
                });
            } catch (err) {
                console.error('Failed to fetch worker tracking data', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkerData();
    }, [selectedWorkerId, users]);

    // Single source of truth: the score computed by the backend (unresolved
    // violations in the last 30 days, -5 each). Keeps web and mobile identical.
    const calculateSafetyScore = () => stats.score;

    // Read-only on UserTracking page. Admin workflow occurs in Violation Logs.

    const baseFilteredViolations = statusFilter === 'All' 
        ? violations 
        : violations.filter(v => 
            statusFilter === 'False Flags (No Impact)' ? v.status === 'False Flag' : v.status !== 'False Flag'
        );

    const filteredViolations = baseFilteredViolations.filter(v => 
        (v.violationType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const searchedUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.workerId && u.workerId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Tracking & Monitoring</h1>
                    <p className="text-gray-500 text-sm mt-1">Detailed compliance and activity profile for specific personnel.</p>
                </div>
                
                {/* Worker Selector */}
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <User size={18} className="text-brand-500 ml-2" />
                    <select 
                        value={selectedWorkerId}
                        onChange={(e) => setSelectedWorkerId(e.target.value)}
                        className="bg-transparent border-none text-sm font-semibold text-gray-700 focus:ring-0 outline-none pr-8 py-1 cursor-pointer"
                    >
                        {searchedUsers.length === 0 && <option value="">No workers found...</option>}
                        {searchedUsers.map(u => (
                            <option key={u._id} value={u.workerId}>
                                {u.username} ({u.workerId || 'No ID'})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading && (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
            )}

            {!isLoading && workerData && (
                <>
                    {/* Worker Profile Overview Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-bl-full opacity-50 -mr-4 -mt-4"></div>
                        <div className="p-8 flex flex-col md:flex-row gap-8 items-center relative z-10">
                            
                            {/* Avatar — show the worker's uploaded photo if set, else the initial */}
                            {workerData.avatar ? (
                                <img
                                    src={workerData.avatar}
                                    alt={workerData.username}
                                    className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-brand-50"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-4 ring-brand-50">
                                    {workerData.username.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-bold text-gray-800">{workerData.username}</h2>
                                <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                        Tracking ID: {workerData.workerId}
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        Role: {workerData.role}
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                        Registered: {new Date(workerData.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Safe Score Dial */}
                            <div className="flex flex-col items-center">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Safety Score</div>
                                <div className={`text-4xl font-black ${calculateSafetyScore() >= 90 ? 'text-emerald-500' : calculateSafetyScore() >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {calculateSafetyScore()}
                                </div>
                                <div className="w-32 h-2 mt-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${calculateSafetyScore() >= 90 ? 'bg-emerald-500' : calculateSafetyScore() >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                        style={{ width: `${calculateSafetyScore()}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
                            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-500 mr-4">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Violations</h3>
                                <h2 className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</h2>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
                            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 mr-4">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Resolved Cases</h3>
                                <h2 className="text-3xl font-bold text-gray-800 mt-1">
                                    {stats.resolved}
                                </h2>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
                            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 mr-4 flex-shrink-0">
                                <Activity size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Last Activity</h3>
                                {workerData.lastLoginAt ? (
                                    <>
                                        <h2 className="text-base font-bold text-gray-800 mt-1 truncate">
                                            {new Date(workerData.lastLoginAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </h2>
                                        <p className="text-xs text-gray-500 truncate">
                                            {new Date(workerData.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </>
                                ) : (
                                    <h2 className="text-base font-bold text-gray-800 mt-1">Never logged in</h2>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Personal Violation Log History - Timeline UI */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Activity size={18} className="text-brand-500" />
                                Compliance Timeline
                            </h3>
                            <div className="relative">
                                <button 
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className="text-sm flex items-center gap-1 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 font-medium bg-white"
                                >
                                    <Filter size={14} /> {statusFilter}
                                </button>
                                {isFilterOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-lg z-20 overflow-hidden">
                                        {['All', 'Valid Violations', 'False Flags (No Impact)'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setStatusFilter(status);
                                                    setIsFilterOpen(false);
                                                }}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition"
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {filteredViolations.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center">
                                <CheckCircle size={40} className="text-emerald-400 mb-3" />
                                <h4 className="font-bold text-gray-800">Perfect Record</h4>
                                <p className="text-gray-500 mt-1">This worker has zero recorded compliance incidents.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-gray-100 ml-4 pl-6 pb-4 space-y-8 mt-4">
                                {filteredViolations.map((v) => (
                                    <div key={v._id} className="relative">
                                        {/* Timeline Dot */}
                                        <div className={`absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-2 border-white ring-4 ring-white ${v.status === 'Resolved' ? 'bg-emerald-500' : v.status === 'False Flag' ? 'bg-gray-400' : 'bg-brand-500'}`}></div>
                                        
                                        {/* Timeline Card */}
                                        <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                {/* Image Thumbnail */}
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                                    {v.imageUrl ? (
                                                        <img src={v.imageUrl} alt="Violation" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Camera size={20} className="text-gray-400" />
                                                    )}
                                                </div>
                                                
                                                {/* Content */}
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                                {v.violationType}
                                                                <span 
                                                                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${v.status === 'False Flag' ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-red-50 border-red-200 text-red-600'}`}
                                                                >
                                                                    {v.status === 'False Flag' ? 'Dismissed: No Impact' : '-5 Safety Points'}
                                                                </span>
                                                            </h4>
                                                            <p className="text-sm font-medium text-gray-600 mt-1">{v.location}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-gray-500">
                                                                {new Date(v.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex items-center gap-3">
                                                        <div className="text-xs font-semibold text-gray-500">AI Confidence:</div>
                                                        <div className="flex-1 max-w-[120px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-brand-500" style={{ width: `${(v.confidence * 100)}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-700">{(v.confidence * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default UserTracking;

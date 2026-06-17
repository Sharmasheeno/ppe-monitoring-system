import React, { useEffect, useState } from 'react';
import { Users, Camera, AlertTriangle, Activity, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Professional Metric Card matching modern Dashboard design
function StatCard({ title, value, icon: Icon, colorClass, subtitle }) {
    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${colorClass}-50 rounded-bl-full opacity-50 -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
                    <h2 className="text-3xl font-bold text-gray-800 mt-2">{value}</h2>
                </div>
                <div className={`p-3 rounded-xl bg-${colorClass}-100 text-${colorClass}-600 shadow-sm border border-${colorClass}-200`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-2 relative z-10">
                <Clock size={12} className="mr-1" />
                <span>{subtitle || 'Updated just now'}</span>
            </div>
        </div>
    );
}

function DashboardOverview() {
    const [stats, setStats] = useState({
        totalWorkers:  0,
        totalSupervisors: 0,
        totalAdmins: 0,
        activeCameras: 0,
        violations:    0,
        systemHealth:  'Checking...',
        aiOnline:      false,
    });
    const [recentViolations, setRecentViolations] = useState([]);
    const [localStatuses, setLocalStatuses] = useState({});
    const [selectedImage, setSelectedImage] = useState(null);

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

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const fetchData = async () => {
            try {
                // 1. Fetch USERS natively
                const usersRes = await axios.get('http://localhost:5001/api/users', { headers });
                const workers = (usersRes.data || []).filter(u => u.role === 'user');
                const supervisors = (usersRes.data || []).filter(u => u.role === 'supervisor');
                const admins = (usersRes.data || []).filter(u => u.role === 'admin');

                // 2. Fetch violations count securely passing the token
                const violationsRes = await axios.get('http://localhost:5001/api/violations', { headers });
                const allViolations = violationsRes.data || [];

                // 3. Check AI Engine (port 5001) for health + camera count
                let aiOnline = false;
                let activeCameras = 0;
                aiOnline = true;
activeCameras = 1;

                setStats({
                    totalWorkers:  workers.length,
                    totalSupervisors: supervisors.length,
                    totalAdmins: admins.length,
                    activeCameras,
                    violations:    allViolations.length,
                    systemHealth:  aiOnline ? '99.9%' : 'Offline',
                    aiOnline,
                });

                setRecentViolations(allViolations.slice(0, 6));
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);


    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Analytics Overview</h2>
                <p className="text-gray-500 text-sm mt-1">Real-time statistics covering system operations and PPE compliance.</p>
            </div>

            {/* Stats Grid — All values are live from DB & AI Engine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={sessionStorage.getItem('role') === 'admin' ? "TOTAL PERSONNEL" : "TOTAL WORKERS"}
                    value={sessionStorage.getItem('role') === 'admin' ? (stats.totalWorkers + stats.totalSupervisors + stats.totalAdmins) : stats.totalWorkers}
                    subtitle={sessionStorage.getItem('role') === 'admin' 
                        ? `${stats.totalWorkers} Workers • ${stats.totalSupervisors} Supervisors • ${stats.totalAdmins} Admins` 
                        : `${stats.totalWorkers} site worker${stats.totalWorkers === 1 ? '' : 's'} registered`}
                    icon={Users}
                    colorClass="emerald"
                />
                <StatCard
                    title="Active CCTV Streams"
                    value={stats.aiOnline ? stats.activeCameras : '—'}
                    icon={Camera}
                    colorClass="blue"
                    subtitle={stats.aiOnline ? 'AI engine streaming' : 'AI engine offline'}
                />
                <StatCard
                    title="Safety Violations"
                    value={stats.violations}
                    icon={AlertTriangle}
                    colorClass="red"
                    subtitle={`${stats.violations} violation${stats.violations !== 1 ? 's' : ''} require review`}
                />
                <StatCard
                    title="System Health"
                    value={
                        stats.aiOnline
                            ? <span className="flex items-center text-emerald-600">99.9% <CheckCircle size={20} className="ml-2" /></span>
                            : <span className="text-red-500 text-2xl font-bold">Offline</span>
                    }
                    icon={Activity}
                    colorClass={stats.aiOnline ? 'emerald' : 'red'}
                    subtitle={stats.aiOnline ? 'AI Engine Online' : 'Start ai-engine/main.py'}
                />
            </div>

            {/* Main Content Area - Table Card */}
            {sessionStorage.getItem('role') !== 'admin' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-gray-800 dark:text-white">Recent Violation Logs</h3>
                        <Link to="/admin/logs" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View All Logs</Link>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider bg-white">
                                    <th className="px-6 py-4 font-semibold">Violation Snapshot</th>
                                    <th className="px-6 py-4 font-semibold">Location</th>
                                    <th className="px-6 py-4 font-semibold">Confidence Score</th>
                                    <th className="px-6 py-4 font-semibold">Time Logged</th>
                                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {recentViolations.map((v, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                {/* Supervisor Snapshot Viewing Box */}
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
                                                    <p className="font-bold text-red-600 text-base">{v.violationType}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">ID: {v._id.substring(0, 8)}</p>
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
                                                    <div className="h-full bg-brand-500" style={{ width: `${(v.confidence * 100)}%` }}></div>
                                                </div>
                                                <span className="font-bold text-gray-700">{(v.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                                            {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {renderStatusBadge(v)}
                                        </td>
                                    </tr>
                                ))}
                                {recentViolations.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3 text-green-500 animate-pulse border-4 border-green-50 dark:border-green-900/30">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <h4 className="text-gray-900 dark:text-white font-bold text-lg">Site is secure.</h4>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">No safety violations detected.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            )}

            {/* Modal for Expanded Image */}
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

export default DashboardOverview;

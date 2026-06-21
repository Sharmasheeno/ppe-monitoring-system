import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar, AreaChart, Area
} from 'recharts';
import { DownloadCloud, TrendingUp, TrendingDown, ShieldAlert, Activity, CheckCircle, User, HardHat, Shirt, Hand } from 'lucide-react';

// Fixed colour map per PPE class so both charts stay consistent.
const CATEGORY_COLORS = {
    'Missing Helmet': '#ef4444',
    'Missing Vest':   '#f59e0b',
    'Missing Glove':  '#3b82f6',
    'Safety Verified': '#10b981',
    'Unknown':        '#94a3b8',
};
const colorFor = (name) => CATEGORY_COLORS[name] || '#64748b';
const CHART_TYPES = ['Missing Helmet', 'Missing Vest', 'Missing Glove'];

export default function AnalyticsHub() {
    const [allViolations, setAllViolations] = useState([]);
    const [users, setUsers] = useState([]);
    const [workerFilter, setWorkerFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const fetchAll = async (isBackground = false) => {
            try {
                if (!isBackground) setIsLoading(true);
                const [vRes, uRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/violations', { headers }),
                    axios.get('http://localhost:5001/api/users', { headers }).catch(() => ({ data: [] })),
                ]);
                setAllViolations(vRes.data || []);
                setUsers((uRes.data || []).filter(u => u.role === 'user' && u.workerId));
            } catch (err) {
                console.error('Failed to load analytics', err);
            } finally {
                if (!isBackground) setIsLoading(false);
            }
        };

        fetchAll();
        const intervalId = setInterval(() => fetchAll(true), 3000);
        return () => clearInterval(intervalId);
    }, []);

    const workerNameById = useMemo(() => {
        const m = {};
        users.forEach(u => { m[u.workerId] = u.username; });
        return m;
    }, [users]);

    // Filter violations by the selected worker (or keep all).
    const violations = useMemo(() => (
        workerFilter === 'All'
            ? allViolations
            : allViolations.filter(v => v.workerId === workerFilter)
    ), [allViolations, workerFilter]);

    const stats = useMemo(() => {
        const pending = violations.filter(v => v.status === 'Pending Review' || !v.status).length;
        const resolved = violations.filter(v => v.status === 'Resolved').length;
        return { total: violations.length, pending, resolved };
    }, [violations]);

    const pieData = useMemo(() => {
        const typeCounts = {};
        violations.forEach(v => {
            const type = v.violationType || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        const arr = Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] }));
        return arr.length > 0 ? arr : [{ name: 'No Data', value: 1 }];
    }, [violations]);

    // 7-day trend split by PPE class so the supervisor can see WHICH type is trending.
    // Each row: { name: 'Mon', 'Missing Helmet': n, 'Missing Vest': n, 'Missing Glove': n, total: n }.
    const lineData = useMemo(() => {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const buckets = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const row = { dayStart: d.getTime(), name: daysOfWeek[d.getDay()], total: 0 };
            CHART_TYPES.forEach(t => { row[t] = 0; });
            buckets.push(row);
        }
        const DAY_MS = 24 * 60 * 60 * 1000;
        violations.forEach(v => {
            const t = new Date(v.timestamp).getTime();
            for (const b of buckets) {
                if (t >= b.dayStart && t < b.dayStart + DAY_MS) {
                    const key = CHART_TYPES.includes(v.violationType) ? v.violationType : null;
                    if (key) b[key] += 1;
                    b.total += 1;
                    break;
                }
            }
        });
        if (buckets.length) buckets[buckets.length - 1].name += ' (Today)';
        return buckets.map(({ dayStart, ...rest }) => rest);
    }, [violations]);

    // Week vs previous-week trend arrow for the header badge.
    const weekTrend = useMemo(() => {
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        const thisWeek = violations.filter(v => now - new Date(v.timestamp).getTime() <  7 * DAY).length;
        const prevWeek = violations.filter(v => {
            const ago = now - new Date(v.timestamp).getTime();
            return ago >= 7 * DAY && ago < 14 * DAY;
        }).length;
        const delta = thisWeek - prevWeek;
        const pct = prevWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round((delta / prevWeek) * 100);
        return { thisWeek, prevWeek, delta, pct };
    }, [violations]);

    // Status-mix for the second donut and the compliance rate KPI.
    const statusData = useMemo(() => {
        const counts = { 'Resolved': 0, 'Pending Review': 0, 'False Flag': 0 };
        violations.forEach(v => {
            const s = v.status || 'Pending Review';
            counts[s] = (counts[s] || 0) + 1;
        });
        const total = counts['Resolved'] + counts['Pending Review'] + counts['False Flag'];
        const rate = total ? Math.round((counts['Resolved'] / total) * 100) : 0;
        return {
            rate,
            data: Object.entries(counts).map(([name, value]) => ({ name, value })),
        };
    }, [violations]);

    const pieTotal = useMemo(() => pieData.reduce((s, d) => s + (d.name === 'No Data' ? 0 : d.value), 0), [pieData]);

    const selectedWorkerLabel = workerFilter === 'All'
        ? 'All Workers'
        : `${workerNameById[workerFilter] || 'Unknown'} (${workerFilter})`;

    // PDF Generation — reflects the currently selected worker (or all workers).
    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text("PPE Safety Compliance Report", 20, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 28);
        doc.text(`Scope: ${selectedWorkerLabel}`, 20, 34);
        doc.line(20, 38, 190, 38);

        // Summary Section
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Executive Summary", 20, 50);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Recorded Incidents: ${stats.total}`, 20, 60);
        doc.text(`Incidents Pending Review: ${stats.pending}`, 20, 68);
        doc.text(`Successfully Resolved Cases: ${stats.resolved}`, 20, 76);

        // Breakdown Section
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Incident Breakdown by Category", 20, 95);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        let yPos = 105;
        pieData.forEach(item => {
            if (item.name !== 'No Data') {
                doc.text(`- ${item.name}: ${item.value} incidents`, 25, yPos);
                yPos += 8;
            }
        });

        // Per-worker breakdown when viewing All Workers.
        if (workerFilter === 'All') {
            const perWorker = {};
            allViolations.forEach(v => {
                const key = v.workerId || 'Unassigned';
                perWorker[key] = (perWorker[key] || 0) + 1;
            });
            const entries = Object.entries(perWorker).sort((a, b) => b[1] - a[1]);
            if (entries.length) {
                yPos += 5;
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("Incidents by Worker", 20, yPos);
                yPos += 10;
                doc.setFontSize(11);
                doc.setFont("helvetica", "normal");
                entries.forEach(([wid, count]) => {
                    const name = workerNameById[wid] || 'Unassigned';
                    doc.text(`- ${name} (${wid}): ${count} incidents`, 25, yPos);
                    yPos += 7;
                    if (yPos > 260) { doc.addPage(); yPos = 20; }
                });
            }
        }

        // Recommendations
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("AI System Recommendations", 20, yPos + 15);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("1. Conduct mandatory safety briefings for the most frequent violation types.", 20, yPos + 25);
        doc.text("2. Ensure adequate PPE inventory is available at all active camera zones.", 20, yPos + 32);
        doc.text("3. Continue reviewing 'Pending' logs daily to maintain strict compliance.", 20, yPos + 39);

        // Footer
        doc.setFontSize(10);
        doc.text("Generated securely by the AI PPE Monitoring Command Center.", 20, 280);

        const fname = workerFilter === 'All'
            ? 'PPE_Safety_Report_All_Workers.pdf'
            : `PPE_Safety_Report_${(workerNameById[workerFilter] || workerFilter).replace(/\s+/g, '_')}.pdf`;
        doc.save(fname);
    };

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Analytics & Reports</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Deep-dive spatial and historical analysis of compliance data.
                        <span className="ml-2 text-gray-700 font-semibold">Viewing: {selectedWorkerLabel}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User size={16} className="text-gray-500" />
                        </div>
                        <select
                            value={workerFilter}
                            onChange={(e) => setWorkerFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 pl-9 pr-8 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors font-medium appearance-none cursor-pointer text-sm"
                        >
                            <option value="All">All Workers</option>
                            {users.map(u => (
                                <option key={u._id} value={u.workerId}>
                                    {u.username} ({u.workerId})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={generatePDF}
                        className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-all font-bold text-sm transform hover:scale-105"
                    >
                        <DownloadCloud size={18} />
                        Download PDF Report
                    </button>
                </div>
            </div>

            {/* Top KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500 mr-4 border border-red-100">
                        <ShieldAlert size={26} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Violations</h3>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</h2>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
                    <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mr-4 border border-amber-100">
                        <Activity size={26} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Pending Review</h3>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">{stats.pending}</h2>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mr-4 border border-emerald-100">
                        <CheckCircle size={26} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Resolved</h3>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">{stats.resolved}</h2>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
                    <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mr-4 border border-brand-100">
                        <TrendingUp size={26} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Compliance Rate</h3>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">{statusData.rate}<span className="text-xl text-gray-400">%</span></h2>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Stacked-area 7-day trend split by PPE class + week-over-week delta */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                                <TrendingUp size={20} className="text-brand-500" />
                                7-Day Compliance Trend
                            </h3>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">Daily incidents split by PPE class</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                Week total: {weekTrend.thisWeek}
                            </span>
                            {weekTrend.prevWeek > 0 && (
                                <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                                    weekTrend.delta > 0 ? 'bg-red-50 text-red-600' :
                                    weekTrend.delta < 0 ? 'bg-emerald-50 text-emerald-600' :
                                                          'bg-gray-100 text-gray-500'
                                }`}>
                                    {weekTrend.delta > 0 ? <TrendingUp size={12} /> :
                                     weekTrend.delta < 0 ? <TrendingDown size={12} /> : null}
                                    {weekTrend.delta > 0 ? '+' : ''}{weekTrend.pct}% vs last week
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mb-2 text-xs font-semibold text-gray-600">
                        {CHART_TYPES.map(t => (
                            <span key={t} className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorFor(t) }}></span>
                                {t}
                            </span>
                        ))}
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                <defs>
                                    {CHART_TYPES.map(t => (
                                        <linearGradient key={t} id={`g-${t.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%"   stopColor={colorFor(t)} stopOpacity={0.55} />
                                            <stop offset="100%" stopColor={colorFor(t)} stopOpacity={0.05} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                                    cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                                    formatter={(v, n) => [v, n]}
                                />
                                {CHART_TYPES.map(t => (
                                    <Area key={t} type="monotone" dataKey={t} stackId="1"
                                          stroke={colorFor(t)} strokeWidth={2}
                                          fill={`url(#g-${t.replace(/\s/g,'')})`} />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rich issue breakdown — donut with centre total + per-class rows + resolution donut */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-black text-gray-800 text-lg mb-1">Issue Breakdown</h3>
                    <p className="text-xs text-gray-400 mb-4 font-medium">Distribution of captured AI alerts</p>

                    <div className="relative h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={90}
                                     paddingAngle={3} dataKey="value" stroke="none">
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={colorFor(entry.name)} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(v, n) => [`${v} (${pieTotal ? Math.round((v / pieTotal) * 100) : 0}%)`, n]}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-gray-900">{pieTotal}</span>
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Alerts</span>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        {pieData.filter(d => d.name !== 'No Data').sort((a, b) => b.value - a.value).map(d => {
                            const pct = pieTotal ? Math.round((d.value / pieTotal) * 100) : 0;
                            return (
                                <div key={d.name} className="flex items-center gap-3 text-sm">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorFor(d.name) }}></span>
                                    <span className="flex-1 font-semibold text-gray-700 truncate">{d.name}</span>
                                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colorFor(d.name) }}></div>
                                    </div>
                                    <span className="font-bold text-gray-800 w-10 text-right">{d.value}</span>
                                    <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
                                </div>
                            );
                        })}
                        {pieTotal === 0 && (
                            <p className="text-center text-xs text-gray-400 py-4">No incidents in this scope yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Fourth row — per-worker leaderboard + resolution status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-black text-gray-800 text-lg mb-1">Incidents per Worker</h3>
                    <p className="text-xs text-gray-400 mb-4 font-medium">
                        {workerFilter === 'All'
                            ? 'Top workers ranked by total incidents (click a bar-row for more)'
                            : `Filtered to ${selectedWorkerLabel} — clear the worker filter to see everyone.`}
                    </p>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={
                                    workerFilter === 'All'
                                        ? Object.entries(
                                            allViolations.reduce((acc, v) => {
                                                const key = v.workerId || 'Unassigned';
                                                acc[key] = (acc[key] || 0) + 1;
                                                return acc;
                                            }, {})
                                          )
                                          .map(([wid, count]) => ({ name: workerNameById[wid] || wid, Incidents: count }))
                                          .sort((a, b) => b.Incidents - a.Incidents)
                                          .slice(0, 8)
                                        : [{ name: workerNameById[workerFilter] || workerFilter, Incidents: stats.total }]
                                }
                                layout="vertical"
                                margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                                    cursor={{ fill: '#f9fafb' }}
                                />
                                <Bar dataKey="Incidents" fill="#10b981" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-black text-gray-800 text-lg mb-1">Resolution Status</h3>
                    <p className="text-xs text-gray-400 mb-4 font-medium">How incidents are being closed out</p>
                    <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData.data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                     paddingAngle={3} dataKey="value" stroke="none">
                                    {statusData.data.map((entry, i) => (
                                        <Cell key={i} fill={
                                            entry.name === 'Resolved'       ? '#10b981' :
                                            entry.name === 'Pending Review' ? '#f59e0b' :
                                                                              '#94a3b8'
                                        } />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                        {statusData.data.map(d => (
                            <div key={d.name} className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor:
                                        d.name === 'Resolved' ? '#10b981' :
                                        d.name === 'Pending Review' ? '#f59e0b' : '#94a3b8'
                                    }}></span>
                                    {d.name}
                                </span>
                                <span className="font-bold text-gray-900">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

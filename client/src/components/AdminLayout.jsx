import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Cctv, LogOut, Shield,
    Search, Bell, Settings, Menu, User, UserCircle, X, PieChart, TestTube,
    Sun, Moon, Mail
} from 'lucide-react';
import axios from 'axios';
import { PPELogo } from './Navbar';

const API = 'http://localhost:5001/api';

function AdminLayout() {
    const location  = useLocation();
    const navigate  = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // ── Dark Mode ──────────────────────────────────────────────
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    // ── Real user info ───────────────────────────────────────
    const [adminInfo, setAdminInfo] = useState({ username: '', email: '', avatar: '' });
    const token = sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        // Load profile once, then re-check every 15s so a session whose
        // account was deleted by another admin gets kicked out quickly even
        // if the user is just idling on the page. The axios interceptor
        // handles the actual redirect on 401.
        const load = () => axios.get(`${API}/users/me`, { headers })
            .then(r => {
                setAdminInfo(r.data);
                sessionStorage.setItem('username', r.data.username);
            })
            .catch(() => {
                // Interceptor already redirects on 401; keep a soft fallback
                // for transient errors so the sidebar doesn't stay blank.
                setAdminInfo(prev => prev.username ? prev : {
                    username: sessionStorage.getItem('username') || 'Supervisor',
                    email: '', avatar: '',
                });
            });
        load();
        const id = setInterval(load, 15000);
        return () => clearInterval(id);
    }, []);

    const [showBell, setShowBell] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [groupedNotifications, setGroupedNotifications] = useState([]);
    const bellRef = useRef();
    const profileRef = useRef();

    useEffect(() => {
        axios.get(`${API}/violations?limit=50`, { headers })
            .then(r => {
                const raw = r.data?.violations || r.data || [];
                setNotifications(raw);

                // Group by workerId and track unique violation classes
                const groups = {};
                raw.forEach(n => {
                    const key = n.workerId || 'Unknown';
                    if (!groups[key]) {
                        groups[key] = { 
                            workerId: key, 
                            count: 0, 
                            latest: n.createdAt, 
                            classes: new Set() 
                        };
                    }
                    groups[key].count++;
                    
                    // The AI returns formats like "VIOLATION: Person detected without Helmet, Vest"
                    // Or specific strings. Let's just track the string or extract keywords
                    if (n.violationType) {
                        if (n.violationType.includes('Helmet')) groups[key].classes.add('Helmet');
                        if (n.violationType.includes('Vest')) groups[key].classes.add('Vest');
                        if (n.violationType.includes('Glove')) groups[key].classes.add('Glove');
                        if (groups[key].classes.size === 0) groups[key].classes.add('General Safety'); // fallback
                    }

                    if (new Date(n.createdAt) > new Date(groups[key].latest)) {
                        groups[key].latest = n.createdAt;
                    }
                });
                
                // Convert back to array
                setGroupedNotifications(Object.values(groups).map(g => ({
                    ...g,
                    violationClasses: Array.from(g.classes).join(', ')
                })).sort((a, b) => new Date(b.latest) - new Date(a.latest)));
            })
            .catch(() => {
                setNotifications([]);
                setGroupedNotifications([]);
            });
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => { 
            if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unreadCount = groupedNotifications.length;

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('username');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const activeRole = sessionStorage.getItem('role') || adminInfo.role || 'admin';
    const basePath = location.pathname.startsWith('/supervisor') ? '/supervisor' : '/admin';

    const navItems = [
        { path: `${basePath}`,          label: 'Dashboard',          icon: LayoutDashboard, allowed: ['admin', 'supervisor'] },
        { path: `${basePath}/sandbox`,  label: 'AI Sandbox',         icon: TestTube,        allowed: ['supervisor'] },
        { path: `${basePath}/analytics`,label: 'Analytics & Reports', icon: PieChart,        allowed: ['supervisor'] },
        { path: `${basePath}/logs`,     label: 'Violation Logs',     icon: Shield,          allowed: ['supervisor'] },
        { path: `${basePath}/tracking`, label: 'User Tracking',      icon: User,            allowed: ['supervisor'] },
        { path: `${basePath}/users`,    label: 'User Management',    icon: Users,           allowed: ['admin', 'supervisor'] },
        { path: `${basePath}/cameras`,  label: 'CCTV Monitor',       icon: Cctv,            allowed: ['supervisor'] },
        { path: `${basePath}/messages`, label: 'Mailbox',            icon: Mail,            allowed: ['admin'] },
        { path: `${basePath}/profile`,  label: 'My Profile',         icon: UserCircle,      allowed: ['admin', 'supervisor'] },
    ];

    const filteredNavItems = navItems.filter(item => item.allowed.includes(activeRole));

    const initials = adminInfo.username
        ? adminInfo.username.slice(0, 2).toUpperCase()
        : 'SV';

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans">

            {/* ── Sidebar ── */}
            <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out bg-green-800 dark:bg-slate-900
                ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} flex flex-col shadow-xl z-20`}>

                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-white/10 bg-black/10 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <PPELogo size={32} inverted />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-400">PPE</span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                                {activeRole === 'admin' ? 'Admin Portal' : 'Supervisor Portal'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile Widget */}
                <Link to={`${basePath}/profile`}
                    className="p-5 border-b border-white/10 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group">
                    {adminInfo.avatar ? (
                        <img src={adminInfo.avatar} alt="avatar"
                            className="w-10 h-10 rounded-full object-cover border-2 border-green-500/40" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold shadow-md text-sm flex-shrink-0">
                            {initials}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{adminInfo.username || 'Supervisor'}</p>
                        <p className="text-xs text-green-200 dark:text-emerald-400 truncate">{adminInfo.email || 'Loading...'}</p>
                    </div>
                </Link>

                {/* Navigation */}
                <div className="px-6 pt-5 pb-2">
                    <p className="text-xs font-bold text-white/60 dark:text-gray-500 uppercase tracking-widest">Navigation</p>
                </div>

                <nav className="flex-1 overflow-y-auto pb-6">
                    <ul className="space-y-1 px-4">
                        {filteredNavItems.map((item) => (
                            <li key={item.path}>
                                <Link to={item.path}
                                    className={`flex items-center px-4 py-2.5 rounded-lg transition-colors font-medium text-sm ${
                                        isActive(item.path)
                                            ? 'bg-white/20 dark:bg-green-600 text-white shadow-md'
                                            : 'text-white/75 dark:text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}>
                                    <item.icon size={18} className="mr-3 flex-shrink-0" />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Log out */}
                <div className="p-4 border-t border-white/10">
                    <button onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2.5 text-red-300 dark:text-red-400 hover:bg-red-500/10 hover:text-red-200 dark:hover:text-red-300 rounded-lg transition-colors text-sm font-medium">
                        <LogOut size={18} className="mr-3" />
                        Log out
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <Menu size={20} />
                        </button>

                        {/* Search */}
                        <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2 w-64 focus-within:ring-2 focus-within:ring-green-500/50 transition-all">
                            <Search size={16} className="text-gray-400 mr-2" />
                            <input type="text" placeholder="Search here..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 w-full placeholder-gray-400" />
                        </div>
                    </div>

                    {/* Right Icons */}
                    <div className="flex items-center gap-2 md:gap-3">

                        {/* ── Dark Mode Toggle ── */}
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* ── Bell Notification (Grouped by Tracking ID) ── */}
                        {activeRole !== 'admin' && (
                            <div className="relative" ref={bellRef}>
                            <button
                                onClick={() => setShowBell(!showBell)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors relative">
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showBell && (
                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                        <span className="font-black text-sm text-gray-900 dark:text-white">Violations by Worker ID</span>
                                        <button onClick={() => setShowBell(false)} className="text-gray-400 hover:text-gray-600">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                                        {groupedNotifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-sm text-gray-400">No recent violations</div>
                                        ) : groupedNotifications.slice(0, 8).map((group, i) => (
                                            <Link
                                                key={i}
                                                to={`${basePath}/tracking`}
                                                onClick={() => setShowBell(false)}
                                                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Shield size={14} className="text-red-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 dark:text-white font-mono">{group.workerId}</p>
                                                    <p className="text-xs text-red-500 font-semibold">{group.count} violation{group.count !== 1 ? 's' : ''}</p>
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 truncate mt-1">
                                                        Missing: {group.violationClasses || 'Unspecified'}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-gray-400 whitespace-nowrap mt-1">
                                                    {group.latest ? new Date(group.latest).toLocaleDateString() : ''}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                        <Link to={`${basePath}/logs`} onClick={() => setShowBell(false)}
                                            className="text-xs font-bold text-green-600 hover:text-green-700">
                                            View all violation logs →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}

                        {/* ── Settings → Profile ── */}
                        <button
                            onClick={() => navigate('/admin/profile')}
                            title="Settings / Profile"
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors">
                            <Settings size={20} />
                        </button>

                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

                        {/* Avatar button → Profile Menu */}
                        <div className="relative" ref={profileRef}>
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                                {adminInfo.avatar ? (
                                    <img src={adminInfo.avatar} alt="avatar"
                                        className="h-8 w-8 rounded-full object-cover border border-green-200" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-700">
                                        <span className="text-xs font-black text-green-700 dark:text-green-400">{initials}</span>
                                    </div>
                                )}
                            </button>

                            {/* Profile Dropdown */}
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b flex flex-col border-gray-100 dark:border-gray-700">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{adminInfo.username || 'Supervisor'}</span>
                                        <span className="text-xs text-gray-500 truncate">{adminInfo.email || 'Admin Account'}</span>
                                    </div>
                                    <div className="py-1">
                                        <Link to="/admin/profile" onClick={() => setShowProfileMenu(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <User size={16} className="mr-3 text-gray-400" /> My Profile
                                        </Link>
                                    </div>
                                    <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                                        <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                                            <LogOut size={16} className="mr-3 text-red-500" /> Log out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
                    <div className="mb-6">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Link to="/admin" className="hover:text-green-600 transition-colors">Dashboard</Link>
                            <span className="mx-2">/</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                                {navItems.find(n => isActive(n.path))?.label || 'Overview'}
                            </span>
                        </div>
                    </div>
                    <Outlet context={{ searchTerm }} />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;

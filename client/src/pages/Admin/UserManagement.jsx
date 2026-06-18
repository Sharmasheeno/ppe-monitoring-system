import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Edit, Plus, User, Shield, Search, X, CheckCircle, AlertCircle, RefreshCw, Users, Lock, Eye, EyeOff } from 'lucide-react';

const API = 'http://localhost:5001/api';

// ── Password Strength Helper ──────────────────────────────────
const passwordCriteria = [
    { label: 'At least 8 characters',     test: (p) => p.length >= 8 },
    { label: 'Uppercase letter (A-Z)',     test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter (a-z)',     test: (p) => /[a-z]/.test(p) },
    { label: 'Number (0-9)',               test: (p) => /\d/.test(p) },
    { label: 'Symbol (e.g. @, #, !)',      test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
    if (!password) return null;
    const passed = passwordCriteria.filter(c => c.test(password)).length;
    const colors = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
                {passwordCriteria.map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passed ? colors[passed - 1] : 'bg-gray-200 dark:bg-gray-600'}`} />
                ))}
            </div>
            <ul className="space-y-0.5">
                {passwordCriteria.map((c, i) => (
                    <li key={i} className={`flex items-center gap-1.5 text-xs ${c.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <CheckCircle size={11} />
                        {c.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Score Badge ───────────────────────────────────────────────
function ScoreBadge({ score }) {
    if (score === undefined || score === null) return <span className="text-xs text-gray-400">—</span>;
    let cls = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (score < 60) cls = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    else if (score < 80) cls = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
            {emoji} {score}%
        </span>
    );
}

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [modalError, setModalError] = useState('');

    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });

    const authHeader = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } });

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => { fetchUsers(); fetchScores(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/users`, authHeader());
            setUsers(res.data);
        } catch (err) {
            showToast('error', 'Failed to load users. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const fetchScores = async () => {
        try {
            const res = await axios.get(`${API}/scores`, authHeader());
            const map = {};
            res.data.forEach(s => { map[s.workerId] = s.score; });
            setScores(map);
        } catch (_) { /* scores non-critical */ }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/users/${id}`, authHeader());
            setUsers(prev => prev.filter(u => u._id !== id));
            setDeleteConfirmId(null);
            showToast('success', 'User deleted successfully.');
        } catch (err) {
            showToast('error', err.response?.data?.msg || 'Failed to delete user.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError('');

        // Client-side strong password validation before hitting server
        if (!isEditMode || formData.password) {
            const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (formData.password && !strongPwd.test(formData.password)) {
                setModalError('Password does not meet strength requirements.');
                return;
            }
        }

        setSaving(true);
        try {
            if (isEditMode) {
                const payload = { username: formData.username, email: formData.email, role: formData.role };
                if (formData.password) payload.password = formData.password;
                await axios.put(`${API}/users/${editingUserId}`, payload, authHeader());
                showToast('success', 'User updated successfully.');
            } else {
                await axios.post(`${API}/auth/register`, formData, authHeader());
                showToast('success', `User "${formData.username}" created.`);
            }
            closeModal();
            fetchUsers();
            fetchScores();
        } catch (err) {
            // Show the error inside the modal so the user actually sees it.
            setModalError(err.response?.data?.msg || 'Error saving user.');
        } finally {
            setSaving(false);
        }
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setEditingUserId(null);
        setFormData({ username: '', email: '', password: '', role: sessionStorage.getItem('role') === 'admin' ? 'supervisor' : 'user' });
        setShowPwd(false);
        setModalError('');
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setIsEditMode(true);
        setEditingUserId(user._id);
        setFormData({ username: user.username, email: user.email || '', password: '', role: user.role });
        setShowPwd(false);
        setModalError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditingUserId(null);
        setModalError('');
        setFormData({ username: '', email: '', password: '', role: sessionStorage.getItem('role') === 'admin' ? 'supervisor' : 'user' });
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.workerId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const roleCount = (role) => users.filter(u => u.role === role).length;

    return (
        <div className="space-y-6 relative">
            {/* Toast notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white font-medium transition-all
                    ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your registered workers</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { fetchUsers(); fetchScores(); }} className="flex items-center px-3 py-2 border border-brand-200 dark:border-gray-600 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-gray-700 transition text-sm">
                        <RefreshCw size={16} className="mr-2" /> Refresh
                    </button>
                    <button onClick={openCreateModal} className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition shadow-md shadow-brand-500/20">
                        <Plus size={18} className="mr-2" /> Add Worker
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Workers', value: roleCount('user'), icon: User, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Site Supervisors', value: roleCount('supervisor'), icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Global Admins', value: roleCount('admin'), icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-brand-100 dark:border-gray-700 flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${stat.bg}`}>
                            <stat.icon size={20} className={stat.color} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search by name, email or tracking ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-brand-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white text-sm"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-brand-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-sm">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Users size={48} className="mb-4 opacity-30" />
                        <p className="font-medium">{searchTerm ? 'No users match your search' : 'No users found'}</p>
                        {!searchTerm && <button onClick={openCreateModal} className="mt-3 text-sm text-brand-600 hover:underline">Add the first worker</button>}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-brand-50 dark:bg-gray-700/50">
                                <tr>
                                    {['Worker', 'Tracking ID', 'Score', 'Role', 'Joined', 'Actions'].map(h => (
                                        <th key={h} className={`px-6 py-3 text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredUsers.map(user => (
                                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.username} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                                                ) : (
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                        {user.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{user.username}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.email || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-mono font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                                                {user.workerId || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <ScoreBadge score={scores[user.workerId]} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                                                ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                    : user.role === 'supervisor'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                    : 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'}`}>
                                                {user.role === 'admin' ? <Shield size={12} /> : user.role === 'supervisor' ? <Shield size={12} /> : <User size={12} />}
                                                {user.role === 'admin' ? 'Global Admin' : user.role === 'supervisor' ? 'Site Supervisor' : 'Site Worker'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {deleteConfirmId === user._id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-red-500 font-medium">Confirm delete?</span>
                                                    <button onClick={() => handleDelete(user._id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 font-semibold">Yes</button>
                                                    <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white text-xs rounded-lg hover:bg-gray-300 font-semibold">No</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEditModal(user)} className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition" title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirmId(user._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Results count */}
            {!loading && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                    Showing {filteredUsers.length} of {users.length} users
                </p>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                                    {isEditMode ? <Edit size={18} className="text-brand-600" /> : <Plus size={18} className="text-brand-600" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {isEditMode ? 'Edit Worker' : 'Add New Worker'}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isEditMode ? 'Update worker details' : 'Create a new worker account'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            {modalError && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                    <span className="font-medium">{modalError}</span>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username *</label>
                                <input
                                    type="text" required
                                    placeholder="Enter username"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
                                <input
                                    type="email" required
                                    placeholder="Enter email"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    value={formData.email}
                                    onChange={e => { setModalError(''); setFormData({ ...formData, email: e.target.value }); }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <Lock size={13} />
                                        {isEditMode ? 'New Password (leave blank to keep unchanged)' : 'Password *'}
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        required={!isEditMode}
                                        placeholder={isEditMode ? '••••••••' : 'Min 8 chars, upper/lower/number/symbol'}
                                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <PasswordStrengthIndicator password={formData.password} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role *</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {sessionStorage.getItem('role') === 'admin' ? (
                                        <>
                                            {(isEditMode && formData.role === 'user') && (
                                                <option value="user">🦺 Site Worker</option>
                                            )}
                                            <option value="supervisor">👁️ Site Supervisor</option>
                                            <option value="admin">🛡️ Global Admin (Restricted)</option>
                                        </>
                                    ) : (
                                        <option value="user">🦺 Site Worker</option>
                                    )}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-brand-500/20 disabled:opacity-70 flex items-center justify-center gap-2">
                                    {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
                                    {isEditMode ? 'Save Changes' : 'Create Worker'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;

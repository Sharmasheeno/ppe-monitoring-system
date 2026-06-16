import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, Save, Lock, User, Mail, Shield, CheckCircle, AlertCircle } from 'lucide-react';

const API = 'http://localhost:5001/api';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all
      ${type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {msg}
    </div>
  );
}

export default function AdminProfile() {
  const token = sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [profile, setProfile] = useState({ username: '', email: '', avatar: '' });
  const [infoForm, setInfoForm] = useState({ username: '', email: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // Fetch profile
  useEffect(() => {
    axios.get(`${API}/users/me`, { headers })
      .then(r => {
        setProfile(r.data);
        setInfoForm({ username: r.data.username, email: r.data.email });
      })
      .catch(() => {
        // Fallback to localStorage
        const un = sessionStorage.getItem('username') || 'Supervisor';
        setProfile({ username: un, email: '', avatar: '' });
        setInfoForm({ username: un, email: '' });
      });
  }, []);

  // Avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        await axios.patch(`${API}/users/profile`, { avatar: base64 }, { headers });
        setProfile(p => ({ ...p, avatar: base64 }));
        showToast('Profile photo updated!');
      } catch { showToast('Failed to update photo', 'error'); }
    };
    reader.readAsDataURL(file);
  };

  // Save info
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await axios.patch(`${API}/users/profile`, infoForm, { headers });
      setProfile(p => ({ ...p, ...infoForm }));
      sessionStorage.setItem('username', infoForm.username);
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to update profile', 'error');
    } finally { setSavingInfo(false); }
  };

  // Change password
  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('New passwords do not match', 'error'); return;
    }
    const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!strongPwd.test(pwForm.newPassword)) {
      showToast('Password must be 8+ chars with uppercase, lowercase, number & symbol', 'error'); return;
    }
    setSavingPw(true);
    try {
      await axios.patch(`${API}/users/profile`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      }, { headers });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully!');
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to change password', 'error');
    } finally { setSavingPw(false); }
  };

  const initials = profile.username ? profile.username.slice(0, 2).toUpperCase() : 'SV';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account information and security settings</p>
      </div>

      {/* Avatar Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-6">
        <div className="relative flex-shrink-0">
          {profile.avatar ? (
            <img src={profile.avatar} alt="avatar"
              className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-green-100" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg border-4 border-green-100">
              <span className="text-3xl font-black text-white">{initials}</span>
            </div>
          )}
          <button
            onClick={() => fileRef.current.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shadow-md hover:bg-green-700 transition-colors"
          >
            <Camera size={14} className="text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">{profile.username || 'Supervisor'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{profile.email || 'No email set'}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              <Shield size={11} /> Supervisor
            </span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <button
            onClick={() => fileRef.current.click()}
            className="px-4 py-2 text-sm font-semibold text-green-700 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-colors"
          >
            Change Photo
          </button>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 2MB</p>
        </div>
      </div>

      {/* Info Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
          <User size={18} className="text-green-600" /> Personal Information
        </h3>
        <p className="text-xs text-gray-400 mb-5">Update your display name and email address</p>
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={infoForm.username}
                  onChange={e => setInfoForm({ ...infoForm, username: e.target.value })}
                  required
                  className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                  placeholder="your-username"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={infoForm.email}
                  onChange={e => setInfoForm({ ...infoForm, email: e.target.value })}
                  required
                  className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                  placeholder="you@company.com"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingInfo}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
            >
              {savingInfo ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Password Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
          <Lock size={18} className="text-green-600" /> Change Password
        </h3>
        <p className="text-xs text-gray-400 mb-5">Must be 8+ chars with uppercase, lowercase, number & symbol</p>
        <form onSubmit={handleChangePw} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Current Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={pwForm.currentPassword}
                onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
                placeholder="Min. 8 chars with A-z, 0-9, !@#"
                className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
              />
            </div>
            {/* Live password strength indicators */}
            {pwForm.newPassword && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { label: '8+ characters', test: pwForm.newPassword.length >= 8 },
                  { label: 'Uppercase (A-Z)', test: /[A-Z]/.test(pwForm.newPassword) },
                  { label: 'Lowercase (a-z)', test: /[a-z]/.test(pwForm.newPassword) },
                  { label: 'Number (0-9)', test: /\d/.test(pwForm.newPassword) },
                  { label: 'Symbol (!@#$)', test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwForm.newPassword) },
                ].map(({ label, test }) => (
                  <div key={label} className={`flex items-center gap-1.5 ${test ? 'text-green-600' : 'text-gray-400'}`}>
                    {test ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    <span className={test ? 'font-semibold' : ''}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
              />
            </div>
            {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Passwords do not match</p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPw}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
            >
              {savingPw ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Lock size={15} />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

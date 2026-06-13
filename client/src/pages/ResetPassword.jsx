import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const passwordCriteria = [
  { label: 'At least 8 characters',   test: (p) => p.length >= 8 },
  { label: 'Uppercase letter (A-Z)',   test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a-z)',   test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0-9)',             test: (p) => /\d/.test(p) },
  { label: 'Symbol (e.g. @, #, !)',    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  if (!password) return null;
  const passed = passwordCriteria.filter(c => c.test(password)).length;
  const colors = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {passwordCriteria.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passed ? colors[passed - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <ul className="space-y-0.5">
        {passwordCriteria.map((c, i) => (
          <li key={i} className={`flex items-center gap-1.5 text-xs ${c.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircle size={11} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!strongPwd.test(password)) {
            setStatus('error');
            setMessage('Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.');
            return;
        }

        setStatus('loading');
        try {
            await axios.post('http://localhost:5001/api/auth/reset-password', {
                token,
                newPassword: password
            });
            setStatus('success');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.msg || 'Error resetting password');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-brand-100 rounded-full">
                         <Lock className="text-brand-600" size={32} />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white font-display">
                    Set New Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Enter your new password below.
                </p>
            </motion.div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
                    {status === 'success' ? (
                         <div className="text-center">
                            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Password Reset Successful!</h3>
                            <p className="mt-2 text-sm text-gray-500">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {status === 'error' && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-red-700">{message}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 block w-full border-brand-200 rounded-md focus:ring-brand-500 focus:border-brand-500 sm:text-sm py-3 bg-white text-black border"
                                        placeholder="Enter new password"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 block w-full border-brand-200 rounded-md focus:ring-brand-500 focus:border-brand-500 sm:text-sm py-3 bg-white text-black border"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                                >
                                    {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;

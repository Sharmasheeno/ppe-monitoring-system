import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle, ArrowLeft, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5001/api/auth';

function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef([]);

    // ── Step 1: Send OTP ──
    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API}/forgot-password`, { email });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to send code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 2: Verify OTP ──
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length < 6) { setError('Please enter the full 6-digit code.'); return; }
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API}/verify-reset-code`, { email, code: fullCode });
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.msg || 'Invalid or expired code.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 3: Set New Password ──
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API}/reset-password`, { email, code: code.join(''), newPassword });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to reset password.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── OTP Input Handler ──
    const handleOtpChange = (val, idx) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...code];
        next[idx] = val.slice(-1);
        setCode(next);
        if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    };

    const handleOtpKeyDown = (e, idx) => {
        if (e.key === 'Backspace' && !code[idx] && idx > 0) {
            inputRefs.current[idx - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            inputRefs.current[5]?.focus();
        }
        e.preventDefault();
    };

    if (success) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-sm w-full mx-4">
                <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Updated!</h2>
                <p className="text-gray-500 dark:text-gray-400">Redirecting you to login...</p>
            </motion.div>
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[100px]"></div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={step}
                    initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10 w-full max-w-md mx-4 p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700"
                >
                    {/* Progress dots */}
                    <div className="flex justify-center gap-2 mb-8">
                        {[1,2,3].map(s => (
                            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-brand-500' : s < step ? 'w-4 bg-brand-400' : 'w-4 bg-gray-200 dark:bg-gray-700'}`} />
                        ))}
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                            <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ── STEP 1: Email ── */}
                    {step === 1 && (
                        <>
                            <div className="mb-8 text-center">
                                <div className="mx-auto w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                                    <Mail className="text-brand-600" size={26} />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Forgot Password?</h1>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter your email and we'll send a 6-digit code</p>
                            </div>
                            <form onSubmit={handleSendCode} className="space-y-5">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white text-sm"
                                            placeholder="Enter your email" />
                                    </div>
                                </div>
                                <button type="submit" disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all">
                                    {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><span>Send Code</span><ArrowRight size={18}/></>}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── STEP 2: OTP ── */}
                    {step === 2 && (
                        <>
                            <div className="mb-8 text-center">
                                <div className="mx-auto w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                                    <KeyRound className="text-brand-600" size={26} />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Enter Code</h1>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    We sent a 6-digit code to <span className="font-semibold text-gray-700 dark:text-gray-300">{email}</span>
                                </p>
                            </div>
                            <form onSubmit={handleVerifyCode} className="space-y-6">
                                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                                    {code.map((digit, i) => (
                                        <input key={i} ref={el => inputRefs.current[i] = el}
                                            type="text" inputMode="numeric" maxLength={1} value={digit}
                                            onChange={e => handleOtpChange(e.target.value, i)}
                                            onKeyDown={e => handleOtpKeyDown(e, i)}
                                            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                        />
                                    ))}
                                </div>
                                <button type="submit" disabled={isLoading || code.join('').length < 6}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all">
                                    {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><span>Verify Code</span><ArrowRight size={18}/></>}
                                </button>
                            </form>
                            <button onClick={() => { setStep(1); setError(''); setCode(['','','','','','']); }}
                                className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1 transition-colors">
                                <ArrowLeft size={14}/> Resend / Change email
                            </button>
                        </>
                    )}

                    {/* ── STEP 3: New Password ── */}
                    {step === 3 && (
                        <>
                            <div className="mb-8 text-center">
                                <div className="mx-auto w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                                    <Lock className="text-brand-600" size={26} />
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">New Password</h1>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set a strong new password for your account</p>
                            </div>
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <input type={showPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                                            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white text-sm"
                                            placeholder="Min 8 chars, uppercase, number, symbol" />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                            {showPwd ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                        <input type={showPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white text-sm"
                                            placeholder="Repeat your new password" />
                                    </div>
                                </div>
                                <button type="submit" disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all mt-2">
                                    {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><span>Update Password</span><CheckCircle size={18}/></>}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center gap-1 transition-colors">
                            <ArrowLeft size={14}/> Back to Login
                        </Link>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default ForgotPassword;

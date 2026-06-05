import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { jsPDF } from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Activity, Download, Bell, Zap } from 'lucide-react';

const SOCKET_URL = 'http://localhost:5001';
const socket = io(SOCKET_URL);

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-white shadow-xl"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-300 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg bg-${color}-500/20 text-${color}-400`}>
        <Icon size={24} />
      </div>
    </div>
  </motion.div>
);

const ViolationItem = ({ violation }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="group flex gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors mb-3"
  >
    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
      {violation.imageUrl ? (
        <img src={violation.imageUrl} alt="Evidence" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <Activity size={20} className="text-gray-600" />
        </div>
      )}
      <div className="absolute top-0 right-0 bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded-bl">
        {(violation.confidence * 100).toFixed(0)}%
      </div>
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start mb-1">
        <h4 className="text-lg font-bold text-red-400 truncate">{violation.violationType}</h4>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(violation.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-sm text-gray-300 mb-2 truncate">{violation.location}</p>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/30">
          Critical
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/30">
          New
        </span>
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [violations, setViolations] = useState([]);
  const [isFlashing, setIsFlashing] = useState(false);
  const audioRef = useRef(new Audio('/alert.mp3'));

  useEffect(() => {
    socket.on('new_violation', (v) => {
      setViolations(prev => [v, ...prev]);
      audioRef.current.play().catch(console.error);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 2000);
    });
    return () => socket.off('new_violation');
  }, []);

  const safeCount = Math.max(0, 100 - violations.length);
  const unsafeCount = violations.length;
  const chartData = [
    { name: 'Safe Workers', count: safeCount, color: '#10b981' }, // Emerald-500
    { name: 'Violations', count: unsafeCount, color: '#ef4444' }, // Red-500
  ];

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.text("Weekly Safety Report", 20, 20);
    violations.forEach((v, i) => doc.text(`${i+1}. ${v.violationType} at ${v.timestamp}`, 20, 30 + (i*10)));
    doc.save("report.pdf");
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden font-sans">
      {/* Background with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/background.png)' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-black/90 pointer-events-none" />

      {/* Red Flash Overlay */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-red-600 pointer-events-none mix-blend-overlay"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-600 rounded-lg shadow-lg shadow-brand-500/30">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Site Guardian</h1>
              <p className="text-brand-300/80 text-sm">AI-Powered Safety Monitoring System</p>
            </div>
          </div>
          <button 
            onClick={downloadReport}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-6 py-3 rounded-xl transition-all font-medium group"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            Export Log
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Active Workers" value={Math.floor(100 + Math.random() * 20)} icon={Zap} color="blue" delay={0.1} />
          <StatCard title="Safety Score" value={`${safeCount}%`} icon={ShieldCheck} color="emerald" delay={0.2} />
          <StatCard title="Violations detected" value={unsafeCount} icon={AlertTriangle} color="red" delay={0.3} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
          
          {/* Left: Feed */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bell size={20} className="text-red-400" />
                Live Feed
              </h2>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Monitoring
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <AnimatePresence>
                {violations.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                        <ShieldCheck size={48} className="mb-4" />
                        <p>No violations detected recently.</p>
                    </div>
                ) : (
                    violations.map((v, i) => <ViolationItem key={i} violation={v} />)
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right: Analytics */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.5 }}
             className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity size={20} className="text-brand-400" />
              Analytics
            </h2>
            <div className="flex-1 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#ffffff10'}}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

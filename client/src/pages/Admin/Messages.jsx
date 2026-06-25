import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Mail, Trash2, Clock, CheckCircle } from 'lucide-react';

const Messages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/messages', {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
            });
            setMessages(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching messages', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const deleteMessage = async (id) => {
        if (!window.confirm('Are you sure you want to delete this message?')) return;
        try {
            await axios.delete(`http://localhost:5001/api/messages/${id}`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
            });
            setMessages(messages.filter(m => m._id !== id));
        } catch (err) {
            console.error('Error deleting message', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-xl">
                    <Mail size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Inbox</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Review contact inquiries from the public website.</p>
                </div>
            </div>

            {messages.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">There are no new contact messages.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {messages.map(msg => (
                        <div key={msg._id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:border-brand-300 transition">
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{msg.subject}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{msg.name}</span>
                                        <span>•</span>
                                        <a href={`mailto:${msg.email}`} className="text-brand-600 hover:underline">{msg.email}</a>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(msg.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => deleteMessage(msg._id)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                    title="Delete Message"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-100 dark:border-gray-700">
                                {msg.message}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Messages;

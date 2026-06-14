import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminDashboard() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get('http://localhost:5001/api/users');
                setUsers(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchUsers();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axios.delete(`http://localhost:5001/api/users/${id}`);
                setUsers(users.filter(user => user._id !== id));
            } catch (err) {
                alert('Error deleting user');
            }
        }
    };

    return (
        <div className="container p-4 mx-auto">
            <h1 className="mb-4 text-3xl font-bold">Admin Dashboard</h1>
            <div className="bg-white rounded shadow-md">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="px-4 py-2 text-left">ID</th>
                            <th className="px-4 py-2 text-left">Username</th>
                            <th className="px-4 py-2 text-left">Role</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id} className="border-b">
                                <td className="px-4 py-2">{user._id}</td>
                                <td className="px-4 py-2">{user.username}</td>
                                <td className="px-4 py-2">{user.role}</td>
                                <td className="px-4 py-2">
                                    <button 
                                        onClick={() => handleDelete(user._id)}
                                        className="px-2 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminDashboard;

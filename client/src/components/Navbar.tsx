import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">C</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                            Context Engine
                        </span>
                    </Link>

                    {/* Navigation */}
                    {user && (
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/tasks"
                                className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                All Tasks
                            </Link>
                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {user.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="btn-ghost text-sm"
                            >
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

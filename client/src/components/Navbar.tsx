import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-14 sm:h-16 items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">C</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 hidden sm:inline">
                            Context Engine
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    {user && (
                        <div className="hidden md:flex items-center gap-4">
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
                            <span className="text-sm text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                                {user.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="btn-ghost text-sm py-1.5 px-3"
                            >
                                Log out
                            </button>
                        </div>
                    )}

                    {/* Mobile Menu Button */}
                    {user && (
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    )}
                </div>

                {/* Mobile Menu */}
                {user && isMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 dark:border-slate-700 py-3 space-y-2">
                        <Link
                            to="/"
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                            Dashboard
                        </Link>
                        <Link
                            to="/tasks"
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                            All Tasks
                        </Link>
                        <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}

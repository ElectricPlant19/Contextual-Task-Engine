import { useState, useEffect, type FormEvent } from 'react';
import type { Task, TaskFormData, EnergyLevel } from '../types';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TaskFormData) => Promise<void>;
    task?: Task | null;
    isLoading: boolean;
}

const defaultFormData: TaskFormData = {
    title: '',
    description: '',
    energyRequired: 'medium',
    estimatedTimeMinutes: 30,
    deadline: '',
};

export function TaskModal({ isOpen, onClose, onSubmit, task, isLoading }: TaskModalProps) {
    const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
    const [error, setError] = useState('');

    // Populate form when editing
    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || '',
                energyRequired: task.energyRequired,
                estimatedTimeMinutes: task.estimatedTimeMinutes,
                deadline: task.deadline ? task.deadline.split('T')[0] : '',
            });
        } else {
            setFormData(defaultFormData);
        }
        setError('');
    }, [task, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim()) {
            setError('Please enter a task title');
            return;
        }

        try {
            await onSubmit(formData);
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Something went wrong');
        }
    };

    const handleChange = (field: keyof TaskFormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal - Full width on mobile, centered on desktop */}
            <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg sm:mx-4 animate-slide-up max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h2 className="heading-secondary text-lg">
                            {task ? 'Edit Task' : 'Add New Task'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="sm:hidden p-2 text-slate-400 hover:text-slate-600"
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="label">
                                What do you need to do?
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="input text-base"
                                placeholder="e.g., Review project proposal"
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="label">
                                Details (optional)
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="input min-h-[80px] resize-none text-base"
                                placeholder="Any additional context..."
                                rows={3}
                            />
                        </div>

                        {/* Energy Required */}
                        <div>
                            <label className="label">Energy required</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => handleChange('energyRequired', level)}
                                        className={`p-3 sm:p-3 rounded-lg text-center transition-all border-2 touch-manipulation active:scale-95 ${formData.energyRequired === level
                                            ? level === 'low'
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                : level === 'medium'
                                                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        <span className="text-xl sm:text-lg block">
                                            {level === 'low' ? '🌙' : level === 'medium' ? '☀️' : '⚡'}
                                        </span>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                                            {level}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Estimated Time */}
                        <div>
                            <label htmlFor="time" className="label">
                                How long will it take?
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="time"
                                    type="number"
                                    min="1"
                                    max="480"
                                    value={formData.estimatedTimeMinutes}
                                    onChange={(e) => handleChange('estimatedTimeMinutes', parseInt(e.target.value) || 30)}
                                    className="input w-24 text-center text-base"
                                />
                                <span className="text-sm text-slate-500">minutes</span>
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {[15, 30, 60, 120].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => handleChange('estimatedTimeMinutes', m)}
                                        className="text-sm px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 touch-manipulation"
                                    >
                                        {m < 60 ? `${m}m` : `${m / 60}h`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Deadline */}
                        <div>
                            <label htmlFor="deadline" className="label">
                                Deadline (optional)
                            </label>
                            <input
                                id="deadline"
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => handleChange('deadline', e.target.value)}
                                className="input text-base"
                            />
                        </div>
                    </div>

                    {/* Footer - Fixed at bottom */}
                    <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 bg-white dark:bg-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary py-3 sm:py-2.5 hidden sm:block"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary py-3 sm:py-2.5 w-full sm:w-auto"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : task ? 'Save Changes' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

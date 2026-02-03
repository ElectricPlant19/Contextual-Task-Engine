import React, { useState, useEffect } from 'react';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim()) {
            setError('Please enter a task title');
            return;
        }

        try {
            await onSubmit(formData);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong');
        }
    };

    const handleChange = (field: keyof TaskFormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-slide-up">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="heading-secondary">
                            {task ? 'Edit Task' : 'Add New Task'}
                        </h2>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
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
                                className="input"
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
                                className="input min-h-[80px] resize-none"
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
                                        className={`p-3 rounded-lg text-center transition-all border-2 ${formData.energyRequired === level
                                                ? level === 'low'
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                    : level === 'medium'
                                                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        <span className="text-lg block">
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
                                    className="input w-24 text-center"
                                />
                                <span className="text-sm text-slate-500">minutes</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                                {[15, 30, 60, 120].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => handleChange('estimatedTimeMinutes', m)}
                                        className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
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
                                className="input"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
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

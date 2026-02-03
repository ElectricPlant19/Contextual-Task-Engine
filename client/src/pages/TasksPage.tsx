import { useState, useEffect } from 'react';
import { Navbar, TaskList, TaskModal } from '../components';
import { tasksApi } from '../services/api';
import type { Task, TaskFormData } from '../types';

export function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const { tasks } = await tasksApi.getAll();
            setTasks(tasks);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTask = async (data: TaskFormData) => {
        setIsSaving(true);
        try {
            await tasksApi.create(data);
            await loadTasks();
            setShowModal(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditTask = async (data: TaskFormData) => {
        if (!editingTask) return;
        setIsSaving(true);
        try {
            await tasksApi.update(editingTask._id, data);
            await loadTasks();
            setEditingTask(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await tasksApi.delete(taskId);
            await loadTasks();
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const handleToggleComplete = async (task: Task) => {
        try {
            if (task.completedAt) {
                await tasksApi.uncomplete(task._id);
            } else {
                await tasksApi.complete(task._id);
            }
            await loadTasks();
        } catch (error) {
            console.error('Failed to toggle task:', error);
        }
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTask(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="heading-primary">All Tasks</h1>
                        <p className="text-calm">Manage your task list</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary"
                    >
                        + Add Task
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <span className="text-4xl animate-pulse">⏳</span>
                        <p className="text-calm mt-4">Loading tasks...</p>
                    </div>
                ) : (
                    <TaskList
                        tasks={tasks}
                        onEdit={openEditModal}
                        onDelete={handleDeleteTask}
                        onToggleComplete={handleToggleComplete}
                        isLoading={isSaving}
                    />
                )}
            </main>

            {/* Add Task Modal */}
            <TaskModal
                isOpen={showModal}
                onClose={closeModal}
                onSubmit={handleAddTask}
                task={null}
                isLoading={isSaving}
            />

            {/* Edit Task Modal */}
            <TaskModal
                isOpen={!!editingTask}
                onClose={closeModal}
                onSubmit={handleEditTask}
                task={editingTask}
                isLoading={isSaving}
            />
        </div>
    );
}

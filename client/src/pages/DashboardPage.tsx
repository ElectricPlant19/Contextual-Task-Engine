import { useState, useEffect } from 'react';
import { Navbar, ContextInputPanel, RecommendationCard, TaskModal } from '../components';
import { tasksApi } from '../services/api';
import type { Task, TaskFormData, RecommendationContext, RecommendationResponse } from '../types';

export function DashboardPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [context, setContext] = useState<RecommendationContext>({
        availableTimeMinutes: 30,
        currentEnergy: 'medium',
    });
    const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingRec, setIsLoadingRec] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load tasks on mount
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
            setIsLoadingTasks(false);
        }
    };

    const getRecommendation = async () => {
        setIsLoadingRec(true);
        try {
            const result = await tasksApi.getRecommendation(context);
            setRecommendation(result);
        } catch (error) {
            console.error('Failed to get recommendation:', error);
        } finally {
            setIsLoadingRec(false);
        }
    };

    const handleComplete = async (taskId: string) => {
        setIsCompleting(true);
        try {
            await tasksApi.complete(taskId);
            await loadTasks();
            // Refresh recommendation
            if (recommendation) {
                await getRecommendation();
            }
        } catch (error) {
            console.error('Failed to complete task:', error);
        } finally {
            setIsCompleting(false);
        }
    };

    const handleSkip = () => {
        setRecommendation(null);
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

    const incompleteTasks = tasks.filter((t) => !t.completedAt);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="heading-primary text-2xl sm:text-3xl">What should I do now?</h1>
                    <p className="text-body mt-2 text-sm sm:text-base">
                        Let your current context guide you to the right task.
                    </p>
                </div>

                {isLoadingTasks ? (
                    <div className="text-center py-12">
                        <span className="text-4xl animate-pulse">⏳</span>
                        <p className="text-calm mt-4">Loading your tasks...</p>
                    </div>
                ) : incompleteTasks.length === 0 ? (
                    /* Empty State */
                    <div className="card text-center py-8 sm:py-12 px-4">
                        <span className="text-4xl mb-4 block">🌱</span>
                        <h2 className="heading-secondary mb-2 text-lg sm:text-xl">Let's get started</h2>
                        <p className="text-body max-w-md mx-auto mb-6 text-sm sm:text-base">
                            Add a few tasks to get personalized recommendations based on your energy and available time.
                        </p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-primary py-3 sm:py-2.5 px-6 touch-manipulation"
                        >
                            Add your first task
                        </button>
                    </div>
                ) : recommendation ? (
                    /* Recommendation View */
                    <div>
                        <RecommendationCard
                            recommendation={recommendation}
                            onComplete={handleComplete}
                            onSkip={handleSkip}
                            isCompleting={isCompleting}
                        />
                    </div>
                ) : (
                    /* Context Input View */
                    <div>
                        <ContextInputPanel
                            context={context}
                            onChange={setContext}
                            onGetRecommendation={getRecommendation}
                            isLoading={isLoadingRec}
                        />

                        {/* Quick add task */}
                        <div className="text-center mt-6">
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn-ghost text-sm py-3 px-4 touch-manipulation"
                            >
                                + Add a new task
                            </button>
                        </div>

                        {/* Task count */}
                        <p className="text-calm text-center mt-4 text-sm">
                            You have {incompleteTasks.length} active task{incompleteTasks.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </main>

            {/* Task Modal */}
            <TaskModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleAddTask}
                task={null}
                isLoading={isSaving}
            />
        </div>
    );
}

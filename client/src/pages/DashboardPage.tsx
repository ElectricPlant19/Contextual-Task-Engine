import { useState, useEffect } from 'react';
import { Navbar, ContextInputPanel, RecommendationCard, TaskModal } from '../components';
import { QuickCapture } from '../components/QuickCapture';
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
    const [showCapture, setShowCapture] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { loadTasks(); }, []);

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
            if (recommendation) await getRecommendation();
        } catch (error) {
            console.error('Failed to complete task:', error);
        } finally {
            setIsCompleting(false);
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

    // QuickCapture uses the same create flow
    const handleQuickCapture = async (data: TaskFormData) => {
        await tasksApi.create(data);
        await loadTasks();
    };

    const incompleteTasks = tasks.filter((t) => !t.completedAt);

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="heading-primary">What should I do now?</h1>
                    <p className="text-body mt-2">
                        Let your current context guide you to the right task.
                    </p>
                </div>

                {isLoadingTasks ? (
                    <div className="text-center py-12">
                        <div style={{
                            width: '32px', height: '32px',
                            border: '2px solid var(--border-subtle)',
                            borderTopColor: 'var(--accent)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto',
                        }} />
                        <p className="text-calm mt-4">Loading your tasks...</p>
                    </div>
                ) : incompleteTasks.length === 0 ? (
                    /* Empty state */
                    <div className="card text-center py-10 px-4">
                        <span className="text-4xl mb-4 block">🌱</span>
                        <h2 className="heading-secondary mb-2">Let's get started</h2>
                        <p className="text-body max-w-md mx-auto mb-6">
                            Add tasks to get personalized recommendations based on your energy and available time.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => setShowCapture(true)} className="btn-primary">
                                ✦ Quick capture
                            </button>
                            <button onClick={() => setShowModal(true)} className="btn-secondary">
                                Add manually
                            </button>
                        </div>
                    </div>
                ) : recommendation ? (
                    <RecommendationCard
                        recommendation={recommendation}
                        onComplete={handleComplete}
                        onSkip={() => setRecommendation(null)}
                        isCompleting={isCompleting}
                    />
                ) : (
                    <div>
                        <ContextInputPanel
                            context={context}
                            onChange={setContext}
                            onGetRecommendation={getRecommendation}
                            isLoading={isLoadingRec}
                        />

                        {/* Quick capture CTA */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            marginTop: '1.5rem',
                            flexWrap: 'wrap',
                        }}>
                            <button
                                onClick={() => setShowCapture(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(212,168,83,0.08)',
                                    border: '1px solid rgba(212,168,83,0.2)',
                                    borderRadius: '7px',
                                    color: 'var(--accent)',
                                    fontSize: '0.8125rem',
                                    fontFamily: 'var(--font-display, sans-serif)',
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(212,168,83,0.14)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,168,83,0.35)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(212,168,83,0.08)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,168,83,0.2)';
                                }}
                            >
                                ✦ Quick capture
                            </button>
                            <button onClick={() => setShowModal(true)} className="btn-ghost" style={{ fontSize: '0.8125rem' }}>
                                + Add manually
                            </button>
                        </div>

                        <p className="text-calm text-center mt-4">
                            {incompleteTasks.length} active task{incompleteTasks.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </main>

            {/* Quick capture modal */}
            <QuickCapture
                isOpen={showCapture}
                onClose={() => setShowCapture(false)}
                onConfirm={handleQuickCapture}
            />

            {/* Manual task modal */}
            <TaskModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleAddTask}
                task={null}
                isLoading={isSaving}
            />

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
import type { ScoredTask, RecommendationResponse } from '../types';
import { EnergyBadge } from './EnergyBadge';

interface RecommendationCardProps {
    recommendation: RecommendationResponse;
    onComplete: (taskId: string) => void;
    onSkip: () => void;
    isCompleting: boolean;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function TaskCard({
    scoredTask,
    isPrimary,
    onComplete,
    isCompleting,
}: {
    scoredTask: ScoredTask;
    isPrimary: boolean;
    onComplete: (taskId: string) => void;
    isCompleting: boolean;
}) {
    const { task, explanation } = scoredTask;

    return (
        <div
            className={`rounded-xl p-4 sm:p-5 transition-all ${isPrimary
                ? 'bg-gradient-to-br from-white to-teal-50/50 dark:from-slate-800 dark:to-teal-900/20 border-l-4 border-l-teal-500 shadow-md'
                : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
                }`}
        >
            {isPrimary && (
                <span className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                    Recommended
                </span>
            )}

            <h3 className={`font-semibold text-slate-800 dark:text-slate-100 ${isPrimary ? 'text-lg sm:text-xl mt-1' : 'text-base sm:text-lg'}`}>
                {task.title}
            </h3>

            {task.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {task.description}
                </p>
            )}

            <div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">
                <EnergyBadge level={task.energyRequired} size="sm" />
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {formatDuration(task.estimatedTimeMinutes)}
                </span>
                {task.deadline && (
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Explanation - the key UX feature */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 italic bg-slate-100 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                {explanation}
            </p>

            {isPrimary && (
                <button
                    onClick={() => onComplete(task._id)}
                    disabled={isCompleting}
                    className="btn-primary w-full mt-4 py-3 sm:py-2.5 text-base sm:text-sm touch-manipulation active:scale-[0.98]"
                >
                    {isCompleting ? 'Marking complete...' : 'Mark as done'}
                </button>
            )}
        </div>
    );
}

export function RecommendationCard({
    recommendation,
    onComplete,
    onSkip,
    isCompleting,
}: RecommendationCardProps) {
    const { recommended, alternatives, message } = recommendation;

    // Empty state
    if (!recommended) {
        return (
            <div className="card text-center py-8 sm:py-12 px-4 animate-fade-in">
                <span className="text-4xl mb-4 block">🌿</span>
                <h3 className="heading-secondary mb-2 text-lg sm:text-xl">No tasks fit this context</h3>
                <p className="text-body max-w-md mx-auto text-sm sm:text-base">
                    {message}
                </p>
                <p className="text-calm mt-4 text-sm">
                    You can always change your mind about your available time or energy.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-slide-up">
            {/* Message */}
            <p className="text-calm text-center text-sm sm:text-base">{message}</p>

            {/* Primary Recommendation */}
            <TaskCard
                scoredTask={recommended}
                isPrimary={true}
                onComplete={onComplete}
                isCompleting={isCompleting}
            />

            {/* Skip button */}
            <div className="text-center">
                <button
                    onClick={onSkip}
                    className="btn-ghost text-sm py-3 px-4 touch-manipulation"
                >
                    Not feeling it? Try different context
                </button>
            </div>

            {/* Alternatives */}
            {alternatives.length > 0 && (
                <div className="mt-6 sm:mt-8">
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                        Other options that fit your context
                    </h4>
                    <div className="grid gap-3">
                        {alternatives.map((alt) => (
                            <TaskCard
                                key={alt.task._id}
                                scoredTask={alt}
                                isPrimary={false}
                                onComplete={onComplete}
                                isCompleting={isCompleting}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

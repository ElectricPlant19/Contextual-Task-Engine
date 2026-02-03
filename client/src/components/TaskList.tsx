
import type { Task } from '../types';
import { EnergyBadge } from './EnergyBadge';

interface TaskListProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    onToggleComplete: (task: Task) => void;
    isLoading: boolean;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
}

export function TaskList({
    tasks,
    onEdit,
    onDelete,
    onToggleComplete,
    isLoading,
}: TaskListProps) {
    const incompleteTasks = tasks.filter((t) => !t.completedAt);
    const completedTasks = tasks.filter((t) => t.completedAt);

    if (tasks.length === 0) {
        return (
            <div className="card text-center py-12">
                <span className="text-4xl mb-4 block">📝</span>
                <h3 className="heading-secondary mb-2">No tasks yet</h3>
                <p className="text-body">
                    Add your first task to get started with context-aware recommendations.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Incomplete Tasks */}
            <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                    Active tasks ({incompleteTasks.length})
                </h3>
                <div className="space-y-2">
                    {incompleteTasks.map((task) => (
                        <TaskItem
                            key={task._id}
                            task={task}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onToggleComplete={onToggleComplete}
                            isLoading={isLoading}
                        />
                    ))}
                    {incompleteTasks.length === 0 && (
                        <p className="text-calm text-center py-4">
                            All caught up! Add more tasks when you're ready.
                        </p>
                    )}
                </div>
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                        Completed ({completedTasks.length})
                    </h3>
                    <div className="space-y-2 opacity-60">
                        {completedTasks.slice(0, 5).map((task) => (
                            <TaskItem
                                key={task._id}
                                task={task}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onToggleComplete={onToggleComplete}
                                isLoading={isLoading}
                            />
                        ))}
                        {completedTasks.length > 5 && (
                            <p className="text-sm text-slate-400 text-center py-2">
                                And {completedTasks.length - 5} more completed tasks
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function TaskItem({
    task,
    onEdit,
    onDelete,
    onToggleComplete,
    isLoading,
}: {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    onToggleComplete: (task: Task) => void;
    isLoading: boolean;
}) {
    const isCompleted = !!task.completedAt;

    return (
        <div
            className={`card flex items-start gap-3 p-4 transition-all hover:shadow-md ${isCompleted ? 'opacity-60' : ''
                }`}
        >
            {/* Checkbox */}
            <button
                onClick={() => onToggleComplete(task)}
                disabled={isLoading}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isCompleted
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-teal-500'
                    }`}
                aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            >
                {isCompleted && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4
                    className={`font-medium text-slate-800 dark:text-slate-100 ${isCompleted ? 'line-through' : ''
                        }`}
                >
                    {task.title}
                </h4>
                {task.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {task.description}
                    </p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <EnergyBadge level={task.energyRequired} size="sm" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDuration(task.estimatedTimeMinutes)}
                    </span>
                    {task.deadline && (
                        <span
                            className={`text-xs ${new Date(task.deadline) < new Date() && !isCompleted
                                    ? 'text-red-500 font-medium'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            {formatDeadline(task.deadline)}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onEdit(task)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label="Edit task"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                </button>
                <button
                    onClick={() => onDelete(task._id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Delete task"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}

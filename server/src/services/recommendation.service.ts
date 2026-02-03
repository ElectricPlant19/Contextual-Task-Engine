import { ITask, EnergyLevel } from '../models';

/**
 * Recommendation Service for the Contextual Task Engine
 * 
 * This implements a deterministic, explainable algorithm that scores tasks
 * based on the user's current context (available time and energy level).
 */

// Energy level hierarchy for comparison
const ENERGY_LEVELS: Record<EnergyLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
};

export interface RecommendationContext {
    availableTimeMinutes: number;
    currentEnergy: EnergyLevel;
}

export interface ScoredTask {
    task: ITask;
    score: number;
    explanation: string;
    breakdown: {
        deadlineScore: number;
        energyMatchScore: number;
        timeEfficiencyScore: number;
    };
}

export interface RecommendationResult {
    recommended: ScoredTask | null;
    alternatives: ScoredTask[];
    message: string;
}

/**
 * Calculate deadline urgency score (0-40 points)
 * Closer deadlines get higher scores
 */
function calculateDeadlineScore(task: ITask): { score: number; explanation: string } {
    if (!task.deadline) {
        // No deadline - moderate priority
        return { score: 15, explanation: 'no deadline' };
    }

    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeadline < 0) {
        // Overdue - highest priority
        return { score: 40, explanation: 'overdue' };
    } else if (hoursUntilDeadline <= 24) {
        // Due within 24 hours
        return { score: 38, explanation: 'due within 24 hours' };
    } else if (hoursUntilDeadline <= 48) {
        // Due within 2 days
        return { score: 32, explanation: 'due within 2 days' };
    } else if (hoursUntilDeadline <= 168) {
        // Due within a week
        return { score: 24, explanation: 'due this week' };
    } else {
        // More than a week away
        return { score: 10, explanation: 'deadline is flexible' };
    }
}

/**
 * Calculate energy match score (0-30 points)
 * Exact energy match is best, lower energy tasks are acceptable
 */
function calculateEnergyMatchScore(
    taskEnergy: EnergyLevel,
    userEnergy: EnergyLevel
): { score: number; explanation: string } {
    const taskLevel = ENERGY_LEVELS[taskEnergy];
    const userLevel = ENERGY_LEVELS[userEnergy];

    if (taskLevel === userLevel) {
        // Perfect match
        return { score: 30, explanation: `matches your ${userEnergy} energy` };
    } else if (taskLevel < userLevel) {
        // Task requires less energy than user has - still good
        return { score: 20, explanation: `requires ${taskEnergy} energy (you have more)` };
    } else {
        // Task requires more energy - should be filtered out, but just in case
        return { score: 0, explanation: 'requires more energy than available' };
    }
}

/**
 * Calculate time efficiency score (0-30 points)
 * Tasks that fit well within available time are preferred
 * Shorter tasks get a slight boost for quick wins
 */
function calculateTimeEfficiencyScore(
    taskMinutes: number,
    availableMinutes: number
): { score: number; explanation: string } {
    const utilizationRatio = taskMinutes / availableMinutes;
    const formattedTime = formatDuration(taskMinutes);

    if (utilizationRatio <= 0.3) {
        // Very quick task - good for momentum
        return { score: 25, explanation: `quick task (${formattedTime})` };
    } else if (utilizationRatio <= 0.6) {
        // Good fit
        return { score: 30, explanation: `fits well in your time (${formattedTime})` };
    } else if (utilizationRatio <= 0.9) {
        // Takes most of available time
        return { score: 22, explanation: `uses most of your time (${formattedTime})` };
    } else {
        // Just barely fits
        return { score: 15, explanation: `tight fit (${formattedTime})` };
    }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format deadline in human-readable format
 */
function formatDeadline(deadline: Date): string {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) {
        return 'overdue';
    } else if (hoursUntil < 24) {
        return 'due today';
    } else if (hoursUntil < 48) {
        return 'due tomorrow';
    } else {
        const days = Math.ceil(hoursUntil / 24);
        return `due in ${days} days`;
    }
}

/**
 * Generate a human-friendly explanation for the recommendation
 */
function generateExplanation(
    task: ITask,
    breakdown: ScoredTask['breakdown'],
    context: RecommendationContext
): string {
    const parts: string[] = [];

    // Start with a calm, supportive opener
    parts.push('Recommended because');

    // Energy match
    if (breakdown.energyMatchScore >= 25) {
        parts.push(`it matches your ${context.currentEnergy} energy`);
    } else if (breakdown.energyMatchScore >= 15) {
        parts.push(`it's doable with your current energy`);
    }

    // Time fit
    parts.push(`takes ${formatDuration(task.estimatedTimeMinutes)}`);

    // Deadline urgency
    if (task.deadline) {
        const deadlineStr = formatDeadline(task.deadline);
        if (breakdown.deadlineScore >= 35) {
            parts.push(`and is ${deadlineStr}`);
        } else if (breakdown.deadlineScore >= 25) {
            parts.push(`with a deadline ${deadlineStr}`);
        }
    }

    return parts.join(', ') + '.';
}

/**
 * Score a single task based on the user's context
 */
function scoreTask(task: ITask, context: RecommendationContext): ScoredTask {
    const deadline = calculateDeadlineScore(task);
    const energy = calculateEnergyMatchScore(task.energyRequired, context.currentEnergy);
    const time = calculateTimeEfficiencyScore(task.estimatedTimeMinutes, context.availableTimeMinutes);

    const breakdown = {
        deadlineScore: deadline.score,
        energyMatchScore: energy.score,
        timeEfficiencyScore: time.score,
    };

    const score = breakdown.deadlineScore + breakdown.energyMatchScore + breakdown.timeEfficiencyScore;
    const explanation = generateExplanation(task, breakdown, context);

    return { task, score, explanation, breakdown };
}

/**
 * Main recommendation function
 * 
 * Algorithm:
 * 1. FILTER: Remove tasks that don't fit the context
 *    - Completed tasks
 *    - Tasks requiring more time than available
 *    - Tasks requiring more energy than user has
 * 
 * 2. SCORE: Calculate score for each remaining task
 *    - Deadline proximity (0-40 points)
 *    - Energy match (0-30 points)
 *    - Time efficiency (0-30 points)
 * 
 * 3. OUTPUT: Return top recommendation + 2 alternatives
 */
export function getRecommendations(
    tasks: ITask[],
    context: RecommendationContext
): RecommendationResult {
    const userEnergyLevel = ENERGY_LEVELS[context.currentEnergy];

    // Step 1: Filter tasks
    const eligibleTasks = tasks.filter((task) => {
        // Exclude completed tasks
        if (task.completedAt) {
            return false;
        }

        // Exclude tasks that take more time than available
        if (task.estimatedTimeMinutes > context.availableTimeMinutes) {
            return false;
        }

        // Exclude tasks that require more energy than user has
        const taskEnergyLevel = ENERGY_LEVELS[task.energyRequired];
        if (taskEnergyLevel > userEnergyLevel) {
            return false;
        }

        return true;
    });

    // Handle empty result
    if (eligibleTasks.length === 0) {
        return {
            recommended: null,
            alternatives: [],
            message: 'No tasks fit this context. Try adjusting your available time or energy level, or add some new tasks.',
        };
    }

    // Step 2: Score all eligible tasks
    const scoredTasks = eligibleTasks
        .map((task) => scoreTask(task, context))
        .sort((a, b) => b.score - a.score);

    // Step 3: Return top recommendation + alternatives
    const [recommended, ...rest] = scoredTasks;
    const alternatives = rest.slice(0, 2);

    return {
        recommended,
        alternatives,
        message: 'Based on what you can handle right now...',
    };
}

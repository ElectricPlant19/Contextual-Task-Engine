// User types
export interface User {
    id: string;
    email: string;
    createdAt: string;
}

// Task types
export type EnergyLevel = 'low' | 'medium' | 'high';

export interface Task {
    _id: string;
    userId: string;
    title: string;
    description?: string;
    energyRequired: EnergyLevel;
    estimatedTimeMinutes: number;
    deadline?: string;
    createdAt: string;
    completedAt?: string;
}

export interface TaskFormData {
    title: string;
    description: string;
    energyRequired: EnergyLevel;
    estimatedTimeMinutes: number;
    deadline: string;
}

// Context types
export interface RecommendationContext {
    availableTimeMinutes: number;
    currentEnergy: EnergyLevel;
}

// API response types
export interface AuthResponse {
    message: string;
    token: string;
    user: User;
}

export interface TasksResponse {
    tasks: Task[];
}

export interface TaskResponse {
    message: string;
    task: Task;
}

export interface ScoredTask {
    task: Task;
    score: number;
    explanation: string;
    breakdown: {
        deadlineScore: number;
        energyMatchScore: number;
        timeEfficiencyScore: number;
    };
}

export interface RecommendationResponse {
    recommended: ScoredTask | null;
    alternatives: ScoredTask[];
    message: string;
}

export interface ErrorResponse {
    message: string;
}

import axios from 'axios';
import type {
    AuthResponse,
    TasksResponse,
    TaskResponse,
    TaskFormData,
    RecommendationContext,
    RecommendationResponse,
} from '../types';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: async (email: string, password: string): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/auth/register', { email, password });
        return data;
    },

    login: async (email: string, password: string): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        return data;
    },

    getMe: async (): Promise<{ user: AuthResponse['user'] }> => {
        const { data } = await api.get('/auth/me');
        return data;
    },
};

// Tasks API
export const tasksApi = {
    getAll: async (): Promise<TasksResponse> => {
        const { data } = await api.get<TasksResponse>('/tasks');
        return data;
    },

    create: async (taskData: TaskFormData): Promise<TaskResponse> => {
        const { data } = await api.post<TaskResponse>('/tasks', {
            ...taskData,
            deadline: taskData.deadline || null,
        });
        return data;
    },

    update: async (id: string, taskData: TaskFormData): Promise<TaskResponse> => {
        const { data } = await api.put<TaskResponse>(`/tasks/${id}`, {
            ...taskData,
            deadline: taskData.deadline || null,
        });
        return data;
    },

    delete: async (id: string): Promise<{ message: string }> => {
        const { data } = await api.delete(`/tasks/${id}`);
        return data;
    },

    complete: async (id: string): Promise<TaskResponse> => {
        const { data } = await api.patch<TaskResponse>(`/tasks/${id}/complete`);
        return data;
    },

    uncomplete: async (id: string): Promise<TaskResponse> => {
        const { data } = await api.patch<TaskResponse>(`/tasks/${id}/uncomplete`);
        return data;
    },

    getRecommendation: async (context: RecommendationContext): Promise<RecommendationResponse> => {
        const { data } = await api.post<RecommendationResponse>('/tasks/recommend', context);
        return data;
    },
};

export default api;

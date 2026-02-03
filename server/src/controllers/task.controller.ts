import { Response } from 'express';
import { Task, EnergyLevel } from '../models';
import { AuthRequest } from '../middleware';
import { getRecommendations, RecommendationContext } from '../services';

/**
 * Get all tasks for the current user
 * GET /api/tasks
 */
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tasks = await Task.find({ userId: req.userId })
            .sort({ createdAt: -1 });

        res.json({ tasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ message: 'Unable to fetch tasks. Please try again.' });
    }
};

/**
 * Create a new task
 * POST /api/tasks
 */
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, energyRequired, estimatedTimeMinutes, deadline } = req.body;

        const task = new Task({
            userId: req.userId,
            title,
            description,
            energyRequired,
            estimatedTimeMinutes,
            deadline: deadline ? new Date(deadline) : undefined,
        });

        await task.save();

        res.status(201).json({
            message: 'Task created',
            task,
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ message: 'Unable to create task. Please try again.' });
    }
};

/**
 * Update a task
 * PUT /api/tasks/:id
 */
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, energyRequired, estimatedTimeMinutes, deadline } = req.body;

        const task = await Task.findOneAndUpdate(
            { _id: id, userId: req.userId },
            {
                title,
                description,
                energyRequired,
                estimatedTimeMinutes,
                deadline: deadline ? new Date(deadline) : null,
            },
            { new: true, runValidators: true }
        );

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        res.json({
            message: 'Task updated',
            task,
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ message: 'Unable to update task. Please try again.' });
    }
};

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const task = await Task.findOneAndDelete({ _id: id, userId: req.userId });

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ message: 'Unable to delete task. Please try again.' });
    }
};

/**
 * Mark a task as complete
 * PATCH /api/tasks/:id/complete
 */
export const completeTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const task = await Task.findOneAndUpdate(
            { _id: id, userId: req.userId },
            { completedAt: new Date() },
            { new: true }
        );

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        res.json({
            message: 'Nice work! Task completed.',
            task,
        });
    } catch (error) {
        console.error('Complete task error:', error);
        res.status(500).json({ message: 'Unable to complete task. Please try again.' });
    }
};

/**
 * Uncomplete a task (mark as not done)
 * PATCH /api/tasks/:id/uncomplete
 */
export const uncompleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const task = await Task.findOneAndUpdate(
            { _id: id, userId: req.userId },
            { $unset: { completedAt: 1 } },
            { new: true }
        );

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        res.json({
            message: 'Task marked as incomplete',
            task,
        });
    } catch (error) {
        console.error('Uncomplete task error:', error);
        res.status(500).json({ message: 'Unable to update task. Please try again.' });
    }
};

/**
 * Get task recommendation based on context
 * POST /api/tasks/recommend
 */
export const getRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { availableTimeMinutes, currentEnergy } = req.body;

        // Validate input
        if (!availableTimeMinutes || !currentEnergy) {
            res.status(400).json({
                message: 'Please provide your available time and current energy level.',
            });
            return;
        }

        if (!['low', 'medium', 'high'].includes(currentEnergy)) {
            res.status(400).json({
                message: 'Energy level must be low, medium, or high.',
            });
            return;
        }

        // Get all user's incomplete tasks
        const tasks = await Task.find({
            userId: req.userId,
            completedAt: { $exists: false },
        });

        const context: RecommendationContext = {
            availableTimeMinutes: Number(availableTimeMinutes),
            currentEnergy: currentEnergy as EnergyLevel,
        };

        // Get recommendations
        const result = getRecommendations(tasks, context);

        res.json(result);
    } catch (error) {
        console.error('Get recommendation error:', error);
        res.status(500).json({ message: 'Unable to get recommendation. Please try again.' });
    }
};

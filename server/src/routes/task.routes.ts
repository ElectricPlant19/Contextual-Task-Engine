import { Router } from 'express';
import { body } from 'express-validator';
import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    getRecommendation,
} from '../controllers';
import { parseTaskFromText } from '../controllers/parse.controller';
import { authMiddleware } from '../middleware';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// Validation middleware
const taskValidation = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Task title is required')
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('energyRequired')
        .isIn(['low', 'medium', 'high'])
        .withMessage('Energy level must be low, medium, or high'),
    body('estimatedTimeMinutes')
        .isInt({ min: 1, max: 480 })
        .withMessage('Estimated time must be between 1 and 480 minutes'),
    body('deadline')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('Invalid deadline date'),
];

const recommendValidation = [
    body('availableTimeMinutes')
        .isInt({ min: 1 })
        .withMessage('Available time must be at least 1 minute'),
    body('currentEnergy')
        .isIn(['low', 'medium', 'high'])
        .withMessage('Energy level must be low, medium, or high'),
];

const parseValidation = [
    body('text')
        .trim()
        .notEmpty()
        .withMessage('Text is required')
        .isLength({ max: 500 })
        .withMessage('Input must be under 500 characters'),
];

// ── Routes ──────────────────────────────────────────────────
// IMPORTANT: specific paths before /:id wildcards
router.get('/', getTasks);
router.post('/parse', parseValidation, parseTaskFromText);
router.post('/recommend', recommendValidation, getRecommendation);
router.post('/', taskValidation, createTask);
router.put('/:id', taskValidation, updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id/uncomplete', uncompleteTask);

export default router;
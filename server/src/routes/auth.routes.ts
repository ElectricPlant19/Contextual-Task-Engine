import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers';
import { authMiddleware } from '../middleware';

const router = Router();

// Validation middleware
const registerValidation = [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authMiddleware, getMe);

export default router;

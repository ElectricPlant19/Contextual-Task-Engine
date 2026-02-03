import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest } from '../middleware';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({ message: 'An account with this email already exists' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            email: email.toLowerCase(),
            passwordHash,
        });

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET as string,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET as string,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
        );

        res.json({
            message: 'Welcome back',
            token,
            user: {
                id: user._id,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.userId).select('-passwordHash');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({
            user: {
                id: user._id,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
};

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { authRoutes, taskRoutes } from './routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Contextual Task Engine API is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contextual-task-engine';

        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`✓ Server running on http://localhost:${PORT}`);
            console.log('  API endpoints:');
            console.log('    POST /api/auth/register');
            console.log('    POST /api/auth/login');
            console.log('    GET  /api/auth/me');
            console.log('    GET  /api/tasks');
            console.log('    POST /api/tasks');
            console.log('    POST /api/tasks/recommend');
        });
    } catch (error) {
        console.error('✗ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

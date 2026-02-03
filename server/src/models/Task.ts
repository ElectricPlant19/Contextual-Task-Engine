import mongoose, { Document, Schema } from 'mongoose';

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface ITask extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    energyRequired: EnergyLevel;
    estimatedTimeMinutes: number;
    deadline?: Date;
    createdAt: Date;
    completedAt?: Date;
}

const taskSchema = new Schema<ITask>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    energyRequired: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: [true, 'Energy level is required'],
    },
    estimatedTimeMinutes: {
        type: Number,
        required: [true, 'Estimated time is required'],
        min: [1, 'Time must be at least 1 minute'],
        max: [480, 'Time cannot exceed 8 hours (480 minutes)'],
    },
    deadline: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
    },
});

// Index for efficient querying
taskSchema.index({ userId: 1, completedAt: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);

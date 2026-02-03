import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    createdAt: Date;
}

const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Don't return passwordHash in JSON responses
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

export const User = mongoose.model<IUser>('User', userSchema);

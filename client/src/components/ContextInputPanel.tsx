import type { EnergyLevel, RecommendationContext } from '../types';

interface ContextInputPanelProps {
    context: RecommendationContext;
    onChange: (context: RecommendationContext) => void;
    onGetRecommendation: () => void;
    isLoading: boolean;
}

const timePresets = [15, 30, 45, 60, 90, 120];

export function ContextInputPanel({
    context,
    onChange,
    onGetRecommendation,
    isLoading,
}: ContextInputPanelProps) {
    const handleTimeChange = (minutes: number) => {
        onChange({ ...context, availableTimeMinutes: minutes });
    };

    const handleEnergyChange = (energy: EnergyLevel) => {
        onChange({ ...context, currentEnergy: energy });
    };

    return (
        <div className="card animate-fade-in">
            <h2 className="heading-secondary mb-1 text-center sm:text-left">What can you handle right now?</h2>
            <p className="text-calm mb-6 text-center sm:text-left">
                Be honest with yourself — there's no wrong answer.
            </p>

            {/* Time Selection */}
            <div className="mb-6">
                <label className="label text-center sm:text-left">Available time</label>
                <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
                    {timePresets.map((minutes) => (
                        <button
                            key={minutes}
                            onClick={() => handleTimeChange(minutes)}
                            className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all touch-manipulation ${context.availableTimeMinutes === minutes
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                }`}
                        >
                            {minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
                        </button>
                    ))}
                </div>
                {/* Custom time input */}
                <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                    <input
                        type="number"
                        min="1"
                        max="480"
                        value={context.availableTimeMinutes}
                        onChange={(e) => handleTimeChange(parseInt(e.target.value) || 15)}
                        className="input w-24 text-center"
                        aria-label="Custom time in minutes"
                    />
                    <span className="text-sm text-slate-500 dark:text-slate-400">minutes</span>
                </div>
            </div>

            {/* Energy Selection */}
            <div className="mb-6">
                <label className="label text-center sm:text-left">Current energy level</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
                        <button
                            key={level}
                            onClick={() => handleEnergyChange(level)}
                            className={`p-3 sm:p-4 rounded-xl text-center transition-all border-2 touch-manipulation active:scale-95 ${context.currentEnergy === level
                                ? level === 'low'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : level === 'medium'
                                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                }`}
                        >
                            <span className="text-xl sm:text-2xl mb-1 block">
                                {level === 'low' ? '🌙' : level === 'medium' ? '☀️' : '⚡'}
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                {level}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Get Recommendation Button */}
            <button
                onClick={onGetRecommendation}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 sm:py-2.5 text-base sm:text-sm touch-manipulation active:scale-[0.98]"
            >
                {isLoading ? (
                    <>
                        <span className="animate-spin">↻</span>
                        Finding the right task...
                    </>
                ) : (
                    'What should I do?'
                )}
            </button>
        </div>
    );
}

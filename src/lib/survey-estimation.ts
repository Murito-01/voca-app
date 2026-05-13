/**
 * Survey Estimation Engine
 * 
 * Pure functions for estimating survey outcomes based on reward-to-recommended ratio.
 * These run on both server and client (no env/DB dependency).
 * 
 * Data collected here will eventually feed a real ML model.
 */

export type QualityLevel = 'tinggi' | 'bagus' | 'sedang' | 'rendah' | 'buruk';
export type SpeedLevel = 'cepat' | 'sedang' | 'lama';

export interface EstimationSummary {
    completion_rate: number;
    quality: QualityLevel;
    quality_color: 'green' | 'yellow' | 'red';
    speed: SpeedLevel;
    speed_color: 'green' | 'yellow' | 'red';
    speed_factor: number;
    estimated_minutes: number;
    ratio: number;
    recommended_reward: number;
}

/**
 * Estimate completion rate based on reward vs recommended ratio.
 */
export function estimateCompletion(reward: number, recommended: number): number {
    if (recommended <= 0) return 0.5;
    const ratio = reward / recommended;

    if (ratio >= 1.2) return 0.9;
    if (ratio >= 1.0) return 0.8;
    if (ratio >= 0.8) return 0.6;
    if (ratio >= 0.6) return 0.45;
    return 0.3;
}

/**
 * Estimate response quality level.
 */
export function estimateQuality(reward: number, recommended: number): QualityLevel {
    if (recommended <= 0) return 'sedang';
    const ratio = reward / recommended;

    if (ratio >= 1.2) return 'tinggi';
    if (ratio >= 1.0) return 'bagus';
    if (ratio >= 0.8) return 'sedang';
    if (ratio >= 0.6) return 'rendah';
    return 'buruk';
}

/**
 * Get color category for quality level.
 */
export function getQualityColor(quality: QualityLevel): 'green' | 'yellow' | 'red' {
    if (quality === 'tinggi' || quality === 'bagus') return 'green';
    if (quality === 'sedang') return 'yellow';
    return 'red';
}

/**
 * Estimate speed factor (responses per minute at this reward level).
 * Base = 1 response/min at optimal reward.
 */
export function estimateSpeed(reward: number, recommended: number): number {
    if (recommended <= 0) return 0.5;
    const ratio = reward / recommended;

    if (ratio >= 1.2) return 1.5;
    if (ratio >= 1.0) return 1.0;
    if (ratio >= 0.8) return 0.7;
    if (ratio >= 0.6) return 0.5;
    return 0.3;
}

/**
 * Estimate time category based on total responses and speed factor.
 */
export function estimateTime(totalResponses: number, speedFactor: number): SpeedLevel {
    if (speedFactor <= 0) return 'lama';
    const minutes = totalResponses / speedFactor;

    if (minutes < 60) return 'cepat';
    if (minutes < 180) return 'sedang';
    return 'lama';
}

/**
 * Get color category for speed level.
 */
export function getSpeedColor(speed: SpeedLevel): 'green' | 'yellow' | 'red' {
    if (speed === 'cepat') return 'green';
    if (speed === 'sedang') return 'yellow';
    return 'red';
}

/**
 * Full estimation summary — the main function for UI consumption.
 */
export function getEstimationSummary(
    reward: number,
    recommended: number,
    totalResponses: number
): EstimationSummary {
    const completion_rate = estimateCompletion(reward, recommended);
    const quality = estimateQuality(reward, recommended);
    const speed_factor = estimateSpeed(reward, recommended);
    const speed = estimateTime(totalResponses, speed_factor);
    const estimated_minutes = speed_factor > 0 ? totalResponses / speed_factor : Infinity;

    return {
        completion_rate,
        quality,
        quality_color: getQualityColor(quality),
        speed,
        speed_color: getSpeedColor(speed),
        speed_factor,
        estimated_minutes,
        ratio: recommended > 0 ? reward / recommended : 0,
        recommended_reward: recommended,
    };
}

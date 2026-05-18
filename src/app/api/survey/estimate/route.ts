import {
    getEstimationSummary,
} from '@/lib/survey-estimation';
import {
    getRewardThresholdParamsFromEnv,
    computeMinRequiredReward,
    computeRecommendedReward,
} from '@/lib/reward-thresholds';

/**
 * POST /api/survey/estimate
 * Public endpoint (no auth) — returns estimation metrics for given inputs.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const reward = Number(body.reward);
        const questionCount = Math.max(0, Math.floor(Number(body.question_count) || 0));
        const totalResponses = Math.max(1, Math.floor(Number(body.total_responses) || 1));

        if (!Number.isFinite(reward) || reward <= 0) {
            return Response.json({ error: 'Reward harus lebih dari 0' }, { status: 400 });
        }

        const p = getRewardThresholdParamsFromEnv();
        const minRequired = computeMinRequiredReward(questionCount, p);
        const recommended = computeRecommendedReward(minRequired, p);

        const estimation = getEstimationSummary(reward, recommended, totalResponses);

        return Response.json({
            completion_rate: estimation.completion_rate,
            quality: estimation.quality,
            speed: estimation.speed,
            recommended_reward: recommended,
            min_required: minRequired,
            estimated_minutes: Number.isFinite(estimation.estimated_minutes)
                ? Math.ceil(estimation.estimated_minutes)
                : null,
        });
    } catch (err: any) {
        return Response.json({ error: err.message ?? 'Internal error' }, { status: 500 });
    }
}

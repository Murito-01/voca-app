import {
    getRewardThresholdParamsFromEnv,
    computeMinRequiredReward,
    computeRecommendedReward
} from '@/lib/reward-thresholds'

/**
 * Public hints for creator UI (no auth). Values mirror server enforcement defaults.
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const q = Math.max(0, Math.floor(Number(url.searchParams.get('questions')) || 0))

        const p = getRewardThresholdParamsFromEnv()
        const minRequired = computeMinRequiredReward(q, p)
        const recommended = computeRecommendedReward(minRequired, p)

        return Response.json({
            data: {
                min_reward_base: p.minRewardBase,
                reward_per_question_idr: p.rewardPerQuestionIdr,
                estimated_minutes_per_question: p.estimatedMinutesPerQuestion,
                reward_per_estimated_minute_idr: p.rewardPerEstimatedMinuteIdr,
                recommended_multiplier: p.recommendedMultiplier,
                for_question_count: q,
                min_required: minRequired,
                recommended: recommended
            }
        })
    } catch (err: any) {
        return Response.json({ error: err.message ?? 'Internal error' }, { status: 500 })
    }
}

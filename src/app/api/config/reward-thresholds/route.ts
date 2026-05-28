import { computeInitialRewardEstimate } from '@/lib/reward-recommendation'

/**
 * Public hints for creator UI (no auth). Values mirror server enforcement defaults.
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const q = Math.max(0, Math.floor(Number(url.searchParams.get('questions')) || 0))

        const recommendation = computeInitialRewardEstimate(1, q)

        return Response.json({
            data: {
                min_reward_base: 100,
                reward_per_question_idr: 100,
                estimated_minutes_per_question: 1.5,
                reward_per_estimated_minute_idr: 0,
                recommended_multiplier: 2.0,
                for_question_count: q,
                min_required: recommendation.min_required,
                recommended: recommendation.recommended
            }
        })
    } catch (err: any) {
        return Response.json({ error: err.message ?? 'Internal error' }, { status: 500 })
    }
}

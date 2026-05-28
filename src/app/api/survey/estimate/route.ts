import { createClient } from '@supabase/supabase-js'
import { evaluateReward, type QuestionLike } from '@/lib/reward-recommendation'
import { getEstimationSummary } from '@/lib/survey-estimation'

/**
 * POST /api/survey/estimate
 * Public endpoint (no auth) — returns estimation metrics for given inputs.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const reward = Number(body.reward)
        const totalResponses = Math.max(1, Math.floor(Number(body.total_responses) || 1))
        const questionCount = Math.max(0, Math.floor(Number(body.question_count) || 0))
        // question_types: optional array of question type strings
        const questionTypes: string[] = Array.isArray(body.question_types)
            ? body.question_types
            : Array.from({ length: questionCount }, () => 'multiple_choice')

        if (!Number.isFinite(reward) || reward <= 0) {
            return Response.json({ error: 'Reward harus lebih dari 0' }, { status: 400 })
        }

        const questions: QuestionLike[] = questionTypes.map((qt: string) => ({ question_type: qt }))
        const evaluation = evaluateReward(reward, totalResponses, questions)
        const estimation = getEstimationSummary(reward, evaluation.recommended, totalResponses)

        return Response.json({
            completion_rate: estimation.completion_rate,
            quality: estimation.quality,
            speed: estimation.speed,
            recommended_reward: evaluation.recommended,
            min_required: evaluation.min_required,
            breakdown: evaluation.breakdown,
            estimated_minutes: Number.isFinite(estimation.estimated_minutes)
                ? Math.ceil(estimation.estimated_minutes)
                : null,
        })
    } catch (err: any) {
        return Response.json({ error: err.message ?? 'Internal error' }, { status: 500 })
    }
}

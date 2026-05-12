/**
 * Minimum / recommended reward rules (creator fairness).
 * Configure via env; optional overrides from app_config (if present).
 */

export type RewardThresholdParams = {
    minRewardBase: number
    rewardPerQuestionIdr: number
    estimatedMinutesPerQuestion: number
    rewardPerEstimatedMinuteIdr: number
    recommendedMultiplier: number
}

export type RewardThresholdEvaluation = {
    questionCount: number
    rewardPerResponse: number
    minRequired: number
    recommended: number
    estimatedMinutesTotal: number
    hardOk: boolean
    softOk: boolean
    hardMessage?: string
    softWarning?: string
}

const SOFT_WARNING_ID =
    'Reward di bawah rekomendasi platform. Responden cenderung kurang serius atau berkualitas rendah.'

function parseNumber(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw === '') return fallback
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function getRewardThresholdParamsFromEnv(): RewardThresholdParams {
    return {
        minRewardBase: parseNumber(process.env.MIN_REWARD_BASE, 500),
        rewardPerQuestionIdr: parseNumber(process.env.REWARD_PER_QUESTION_IDR, 20),
        estimatedMinutesPerQuestion: parseNumber(
            process.env.ESTIMATED_MINUTES_PER_QUESTION,
            1.5
        ),
        rewardPerEstimatedMinuteIdr: parseNumber(
            process.env.REWARD_PER_ESTIMATED_MINUTE_IDR,
            100
        ),
        recommendedMultiplier: parseNumber(
            process.env.REWARD_RECOMMENDED_MULTIPLIER,
            1.35
        )
    }
}

/**
 * Optional DB overrides: table app_config (key text primary, value_numeric numeric).
 * Missing table or rows → ignored.
 */
export async function mergeRewardParamsFromAppConfig(
    supabase: { from: (t: string) => any },
    base: RewardThresholdParams
): Promise<RewardThresholdParams> {
    const keys = [
        'min_reward_base',
        'reward_per_question_idr',
        'estimated_minutes_per_question',
        'reward_per_estimated_minute_idr',
        'reward_recommended_multiplier'
    ] as const

    try {
        const { data, error } = await supabase
            .from('app_config')
            .select('key, value_numeric')
            .in('key', keys)

        if (error || !data?.length) return base

        const map = new Map(
            data.map((row: { key: string; value_numeric: number | null }) => [
                row.key,
                row.value_numeric
            ])
        )

        const num = (v: unknown, fallback: number) => {
            const n = typeof v === 'number' ? v : Number(v)
            return Number.isFinite(n) && n > 0 ? n : fallback
        }

        return {
            minRewardBase: num(map.get('min_reward_base'), base.minRewardBase),
            rewardPerQuestionIdr: num(
                map.get('reward_per_question_idr'),
                base.rewardPerQuestionIdr
            ),
            estimatedMinutesPerQuestion: num(
                map.get('estimated_minutes_per_question'),
                base.estimatedMinutesPerQuestion
            ),
            rewardPerEstimatedMinuteIdr: num(
                map.get('reward_per_estimated_minute_idr'),
                base.rewardPerEstimatedMinuteIdr
            ),
            recommendedMultiplier: num(
                map.get('reward_recommended_multiplier'),
                base.recommendedMultiplier
            )
        }
    } catch {
        return base
    }
}

export function computeMinRequiredReward(
    questionCount: number,
    p: RewardThresholdParams
): number {
    const q = Math.max(0, Math.floor(questionCount))
    const questionComponent = q * p.rewardPerQuestionIdr
    const estimatedMinutesTotal = q * p.estimatedMinutesPerQuestion
    const timeComponent =
        estimatedMinutesTotal * p.rewardPerEstimatedMinuteIdr
    return Math.ceil(
        Math.max(p.minRewardBase, questionComponent + timeComponent)
    )
}

export function computeRecommendedReward(
    minRequired: number,
    p: RewardThresholdParams
): number {
    return Math.ceil(minRequired * p.recommendedMultiplier)
}

export function evaluateRewardThresholds(
    rewardPerResponse: number,
    questionCount: number,
    p: RewardThresholdParams
): RewardThresholdEvaluation {
    const q = Math.max(0, Math.floor(questionCount))
    const estimatedMinutesTotal = q * p.estimatedMinutesPerQuestion
    const minRequired = computeMinRequiredReward(q, p)
    const recommended = computeRecommendedReward(minRequired, p)
    const reward = Number(rewardPerResponse) || 0

    const hardOk = reward >= minRequired
    const softOk = reward >= recommended

    let hardMessage: string | undefined
    if (!hardOk) {
        hardMessage = `Minimum reward adalah Rp ${minRequired.toLocaleString('id-ID')} untuk survey ini (${q} pertanyaan, estimasi ~${Math.ceil(estimatedMinutesTotal)} menit mengisi). Kamu memasukkan Rp ${Math.floor(reward).toLocaleString('id-ID')}.`
    }

    let softWarning: string | undefined
    if (hardOk && !softOk) {
        softWarning = SOFT_WARNING_ID
    }

    return {
        questionCount: q,
        rewardPerResponse: reward,
        minRequired,
        recommended,
        estimatedMinutesTotal,
        hardOk,
        softOk,
        hardMessage,
        softWarning
    }
}

export function assertRewardMeetsHardRule(evaluation: RewardThresholdEvaluation): void {
    if (!evaluation.hardOk && evaluation.hardMessage) {
        const err = new Error(evaluation.hardMessage) as Error & { code?: string }
        err.code = 'REWARD_BELOW_MINIMUM'
        throw err
    }
}

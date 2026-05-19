/**
 * Reward Recommendation — Single Source of Truth
 *
 * Pure, client-safe functions for computing min_required and recommended
 * reward values. No env vars, no DB dependencies.
 *
 * These run on both server (API routes) and client (UI).
 *
 * Tariffs (final, per spec):
 *   - Rp 100 per respondent (base)
 *   - Rp 100 per multiple-choice / checkbox question
 *   - Rp 200 per essay (text / textarea) question
 *   - recommended = min_required × 2
 */

export type QuestionType = 'multiple_choice' | 'checkbox' | 'text' | 'textarea' | string

export const REWARD_TARIFF = {
    /** Base cost per respondent target */
    PER_RESPONDENT: 100,
    /** Cost per multiple-choice or checkbox question */
    MULTIPLE_CHOICE_OR_CHECKBOX: 100,
    /** Cost per essay (text / textarea) question */
    ESSAY: 200,
    /** recommended = min_required × this multiplier */
    RECOMMENDED_MULTIPLIER: 2,
} as const

export interface QuestionLike {
    question_type: QuestionType
}

export interface RewardRecommendation {
    min_required: number
    recommended: number
    breakdown: {
        base_per_respondent: number
        per_question_cost: number
    }
}

/**
 * Returns true for essay-type questions.
 */
export function isEssayType(questionType: QuestionType): boolean {
    return questionType === 'text' || questionType === 'textarea'
}

/**
 * Compute the cost contribution of a single question.
 */
export function questionCost(questionType: QuestionType): number {
    return isEssayType(questionType)
        ? REWARD_TARIFF.ESSAY
        : REWARD_TARIFF.MULTIPLE_CHOICE_OR_CHECKBOX
}

/**
 * Compute min_required and recommended reward given total respondents
 * and an array of questions (with their types).
 *
 * Formula:
 *   base = totalResponses * 100
 *   question_cost = sum of per-question costs
 *   min_required = base + question_cost
 *   recommended  = min_required * 2
 */
export function computeRewardRecommendation(
    totalResponses: number,
    questions: QuestionLike[]
): RewardRecommendation {
    const base = Math.max(1, Math.floor(totalResponses)) * REWARD_TARIFF.PER_RESPONDENT
    const perQuestionCost = questions.reduce((sum, q) => sum + questionCost(q.question_type), 0)
    const min_required = base + perQuestionCost
    const recommended = min_required * REWARD_TARIFF.RECOMMENDED_MULTIPLIER

    return {
        min_required,
        recommended,
        breakdown: {
            base_per_respondent: base,
            per_question_cost: perQuestionCost,
        },
    }
}

/**
 * Shorthand for create survey flow — no real questions yet.
 * Uses an assumed question count (all treated as multiple-choice for
 * a conservative estimate; creator can adjust).
 *
 * @param totalResponses - target number of respondents
 * @param assumedQuestionCount - creator's estimate of how many questions they'll add (default 0)
 */
export function computeInitialRewardEstimate(
    totalResponses: number,
    assumedQuestionCount: number = 0
): RewardRecommendation {
    const fakeQuestions: QuestionLike[] = Array.from(
        { length: Math.max(0, Math.floor(assumedQuestionCount)) },
        () => ({ question_type: 'multiple_choice' as QuestionType })
    )
    return computeRewardRecommendation(totalResponses, fakeQuestions)
}

/**
 * Evaluate whether a given reward meets the minimum and recommended thresholds.
 * Used by both UI and API routes.
 */
export interface RewardEvaluation {
    min_required: number
    recommended: number
    reward: number
    hardOk: boolean    // reward >= min_required
    softOk: boolean    // reward >= recommended
    hardMessage?: string
    softWarning?: string
    breakdown: RewardRecommendation['breakdown']
}

export function evaluateReward(
    rewardPerResponse: number,
    totalResponses: number,
    questions: QuestionLike[]
): RewardEvaluation {
    const { min_required, recommended, breakdown } = computeRewardRecommendation(
        totalResponses,
        questions
    )
    const reward = Number(rewardPerResponse) || 0
    const hardOk = reward >= min_required
    const softOk = reward >= recommended

    const hardMessage = hardOk
        ? undefined
        : `Minimum reward adalah Rp ${min_required.toLocaleString('id-ID')} (${questions.length} pertanyaan, ${Math.floor(totalResponses)} responden). Kamu memasukkan Rp ${Math.floor(reward).toLocaleString('id-ID')}.`

    const softWarning =
        hardOk && !softOk
            ? 'Reward di bawah rekomendasi platform. Responden cenderung kurang serius atau berkualitas rendah.'
            : undefined

    return { min_required, recommended, reward, hardOk, softOk, hardMessage, softWarning, breakdown }
}

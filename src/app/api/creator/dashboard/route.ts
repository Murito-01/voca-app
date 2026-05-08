import { createClient } from '@supabase/supabase-js'

type BurnRateMetrics = {
    burn_rate_per_sec: number;
    estimated_minutes_left: number | null;
};

type SurveyRow = {
    id: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    created_at: string;
    locked_budget: number | string | null;
};

async function getSurveyTotalSpent(supabase: any, surveyId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_survey_burn_rate', {
        p_survey_id: surveyId
    });

    if (!error) {
        const firstRow = Array.isArray(data) ? data[0] : data;
        return Number(firstRow?.total_spent) || 0;
    }

    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'spend')
        .eq('metadata->>survey_id', surveyId);

    if (txError || !transactions) {
        return 0;
    }

    return transactions.reduce((sum: number, row: { amount: number | string | null }) => {
        return sum + (Number(row.amount) || 0);
    }, 0);
}

async function getActiveDurationSeconds(supabase: any, survey: SurveyRow): Promise<number> {
    const now = Date.now();
    const createdAtMs = new Date(survey.created_at).getTime();
    const fallback = Math.max((now - createdAtMs) / 1000, 1);

    try {
        const { data, error } = await supabase
            .from('survey_events')
            .select('event_type, created_at')
            .eq('survey_id', survey.id)
            .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) {
            return fallback;
        }

        let totalActiveSeconds = 0;
        let activeStartedAt: number | null = null;

        for (const row of data) {
            const eventType = row.event_type;
            const eventAtMs = new Date(row.created_at).getTime();

            if (eventType === 'resumed' && activeStartedAt === null) {
                activeStartedAt = eventAtMs;
            } else if ((eventType === 'paused' || eventType === 'completed') && activeStartedAt !== null) {
                totalActiveSeconds += (eventAtMs - activeStartedAt) / 1000;
                activeStartedAt = null;
            }
        }

        if (survey.status === 'active' && activeStartedAt !== null) {
            totalActiveSeconds += (now - activeStartedAt) / 1000;
        }

        return Math.max(totalActiveSeconds, 1);
    } catch {
        return fallback;
    }
}

async function getBurnRateMetrics(supabase: any, activeSurveys: SurveyRow[]): Promise<BurnRateMetrics> {
    if (activeSurveys.length === 0) {
        return { burn_rate_per_sec: 0, estimated_minutes_left: null };
    }

    const perSurveyMetrics = await Promise.all(
        activeSurveys.map(async (survey) => {
            const totalSpent = await getSurveyTotalSpent(supabase, survey.id);
            const activeDurationSeconds = await getActiveDurationSeconds(supabase, survey);

            return { totalSpent, activeDurationSeconds };
        })
    );

    const totalSpent = perSurveyMetrics.reduce((sum, item) => sum + item.totalSpent, 0);
    const totalActiveDurationSeconds = perSurveyMetrics.reduce((sum, item) => sum + item.activeDurationSeconds, 0);
    const totalBurnRatePerSec = totalActiveDurationSeconds > 0 ? totalSpent / totalActiveDurationSeconds : 0;

    if (totalBurnRatePerSec <= 0) {
        return { burn_rate_per_sec: 0, estimated_minutes_left: null };
    }

    const activeRemainingBudget = activeSurveys.reduce(
        (sum, survey) => sum + (Number(survey.locked_budget) || 0),
        0
    );

    return {
        burn_rate_per_sec: totalBurnRatePerSec,
        estimated_minutes_left: activeRemainingBudget / totalBurnRatePerSec / 60
    };
}

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Fetch Surveys
        const { data: surveys, error: surveysError } = await supabase
            .from('surveys')
            .select('id, reward_per_response, locked_budget, status, created_at')
            .eq('creator_id', user.id);

        if (surveysError) throw surveysError;

        const surveyIds = surveys.map(s => s.id);

        // 2. Fetch Responses
        let responses: any[] = [];
        if (surveyIds.length > 0) {
            const { data: resp, error: respError } = await supabase
                .from('responses')
                .select('survey_id, status')
                .in('survey_id', surveyIds);
            
            if (respError) throw respError;
            responses = resp || [];
        }

        // 3. Aggregate
        let total_budget = 0;
        let used_budget = 0;
        let remaining_budget = 0;

        let valid = 0;
        let low_quality = 0;
        let rejected = 0;

        surveys.forEach(s => {
            remaining_budget += (Number(s.locked_budget) || 0);
        });

        responses.forEach(r => {
            const survey = surveys.find(s => s.id === r.survey_id);
            const reward = survey?.reward_per_response || 0;

            if (r.status === 'valid') {
                valid++;
                used_budget += reward;
            } else if (r.status === 'low_quality') {
                low_quality++;
                used_budget += (reward * 0.5); // Partial reward
            } else if (r.status === 'rejected') {
                rejected++;
            }
        });

        total_budget = used_budget + remaining_budget;
        const total_responses = valid + low_quality + rejected;
        const valid_rate = total_responses > 0 ? (valid / total_responses) * 100 : 0;
        const activeSurveys = surveys.filter((s: SurveyRow) => s.status === 'active');
        const burnRate = await getBurnRateMetrics(supabase, activeSurveys);

        return Response.json({
            data: {
                budget: {
                    total: total_budget,
                    used: used_budget,
                    remaining: remaining_budget
                },
                responses: {
                    valid,
                    low_quality,
                    rejected,
                    total: total_responses,
                    valid_rate
                },
                burn_rate: {
                    burn_rate_per_sec: burnRate.burn_rate_per_sec,
                    estimated_minutes_left: burnRate.estimated_minutes_left
                }
            }
        });

    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

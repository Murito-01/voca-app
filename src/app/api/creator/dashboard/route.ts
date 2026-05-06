import { createClient } from '@supabase/supabase-js'

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
            .select('id, reward_per_response, locked_budget')
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
                }
            }
        });

    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

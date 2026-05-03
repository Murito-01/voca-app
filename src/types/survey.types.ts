export interface Survey {
    id: string;
    creator_id: string;
    title: string;
    description: string | null;
    reward_per_response: number;
    total_responses: number;
    remaining_responses: number;
    status: 'draft' | 'active' | 'completed' | 'paused';
    created_at: string;
}

export interface Question {
    id: string;
    survey_id: string;
    question_text: string;
    question_type: 'text' | 'radio' | 'checkbox';
    is_required: boolean;
    created_at?: string;
    is_attention_check?: boolean;
    correct_option_id?: string | null;
    options?: Option[];
}

export interface Option {
    id: string;
    question_id: string;
    option_text: string;
    created_at: string;
}

import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function getToken(): Promise<string | undefined> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

function authHeaders(token?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${label}: ${err.error || res.statusText}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DraftAnswerRow {
  response_id: string;
  question_id: string;
  option_id:   string | null;
  answer_text: string | null;
}

export interface ResponseDetail {
  id: string;
  created_at: string;
  score: number;
  status: string;
  score_breakdown: Record<string, any>;
  reward_final: number;
  survey: {
    title: string;
    description: string;
    reward: number;
  };
  answers: {
    answer_id: string;
    question_id: string;
    question_text: string;
    question_type: string;
    answer_text: string | null;
    option_id: string | null;
    option_text: string | null;
  }[];
}

export interface SaveAnswerPayload {
  response_id: string;
  question_id: string;
  /** Radio */
  option_id?:   string;
  /** Essay */
  answer_text?: string;
  /** Checkbox */
  option_ids?:  string[];
}

// ─────────────────────────────────────────────
// 1. Start a survey response → returns response_id
// ─────────────────────────────────────────────

export async function startSurveyResponse(surveyId: string): Promise<string> {
  const token = await getToken();

  const res = await fetch('/api/response/start', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ survey_id: surveyId }),
  });

  const json = await handleResponse<{ data: { response_id: string } }>(res, 'startSurveyResponse');
  return json.data.response_id;
}

// ─────────────────────────────────────────────
// 2. Get draft (saved answers so far)
// ─────────────────────────────────────────────

export async function getDraftResponse(surveyId: string): Promise<DraftAnswerRow[]> {
  const token = await getToken();

  const res = await fetch(`/api/response/draft?survey_id=${encodeURIComponent(surveyId)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  const json = await handleResponse<{ data: DraftAnswerRow[] }>(res, 'getDraftResponse');
  return json.data;
}

// ─────────────────────────────────────────────
// 3. Save a single answer (radio / essay / checkbox)
// ─────────────────────────────────────────────

export async function saveAnswer(payload: SaveAnswerPayload): Promise<void> {
  const token = await getToken();

  const res = await fetch('/api/response/answer', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  await handleResponse<{ success: boolean }>(res, 'saveAnswer');
}

// ─────────────────────────────────────────────
// 4. Submit the response (finalize + score)
// ─────────────────────────────────────────────

export interface SubmitResponsePayload {
  survey_id: string;
}

export async function submitSurveyResponse(payload: SubmitResponsePayload) {
  const token = await getToken();

  const res = await fetch('/api/response/submit', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleResponse<{ success: boolean; response?: { id: string } }>(res, 'submitSurveyResponse');
}

// ─────────────────────────────────────────────
// 5. Get all my responses
// ─────────────────────────────────────────────

export async function getMyResponses() {
  const token = await getToken();

  const res = await fetch('/api/response/my', {
    method: 'GET',
    headers: authHeaders(token),
  });

  return handleResponse<{ data: any[] }>(res, 'getMyResponses');
}

// ─────────────────────────────────────────────
// 6. Get response by ID (with retry for pending)
// ─────────────────────────────────────────────

export async function getResponseById(id: string): Promise<{ data: ResponseDetail }> {
  const token = await getToken();

  const res = await fetch(`/api/response/${id}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  return handleResponse<{ data: ResponseDetail }>(res, 'getResponseById');
}

import { supabase } from "@/lib/supabase";

export interface SubmitResponsePayload {
  survey_id: string;
  started_at: string;
  answers: Record<string, string | string[]>;
}

export async function submitSurveyResponse(payload: SubmitResponsePayload) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/response/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    throw new Error(`Failed to submit response: ${errorMessage}`);
  }

  return response.json();
}

export async function getMyResponses() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/response/my', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    throw new Error(`Failed to fetch responses: ${errorMessage}`);
  }

  return response.json();
}

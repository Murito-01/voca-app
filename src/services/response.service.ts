export interface SubmitResponsePayload {
  user_id: string;
  survey_id: string;
  score: number;
}

export async function submitSurveyResponse(payload: SubmitResponsePayload) {
  const response = await fetch('/api/response/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

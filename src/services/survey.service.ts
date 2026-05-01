import { supabase } from "@/lib/supabase";

export async function getSurveys() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('/api/survey/list', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    throw new Error(`Failed to fetch surveys: ${errorMessage}`);
  }

  return response.json();
}

export async function getSurveyById(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`/api/survey/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    throw new Error(`Failed to fetch survey: ${errorMessage}`);
  }

  return response.json();
}

export async function getSurveyQuestions(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`/api/survey/${id}/questions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    throw new Error(`Failed to fetch survey questions: ${errorMessage}`);
  }

  return response.json();
}

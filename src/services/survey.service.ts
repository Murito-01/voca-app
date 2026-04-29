export async function getSurveys(userId?: string) {
  let url = '/api/survey/list';
  if (userId) {
    url += `?user_id=${encodeURIComponent(userId)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(`/api/survey/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    throw new Error(`Failed to fetch survey: ${errorMessage}`);
  }

  return response.json();
}

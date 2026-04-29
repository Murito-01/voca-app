"use client";

import { useState } from "react";
import { submitSurveyResponse } from "@/services/response.service";

export default function SubmitResponseButton({ surveyId: initialSurveyId }: { surveyId?: string }) {
  const [userId, setUserId] = useState('');
  const [surveyId, setSurveyId] = useState(initialSurveyId || '');
  const [score, setScore] = useState<number | string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await submitSurveyResponse({
        user_id: userId,
        survey_id: surveyId,
        score: Number(score)
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-sm">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">User ID</label>
        <input 
          type="text" 
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
          placeholder="Enter user UUID"
        />
      </div>

      {!initialSurveyId && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Survey ID</label>
          <input 
            type="text" 
            value={surveyId}
            onChange={e => setSurveyId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
            placeholder="Enter survey UUID"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Score</label>
        <input 
          type="number" 
          value={score}
          onChange={e => setScore(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
          placeholder="Enter score"
        />
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={isLoading}
        className={`mt-2 px-6 py-2.5 font-medium text-white rounded-lg transition-all duration-200 flex justify-center ${
          isLoading 
            ? "bg-gray-400 cursor-not-allowed opacity-70" 
            : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md hover:shadow-lg"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </span>
        ) : (
          "Submit Response"
        )}
      </button>

      {error && (
        <div className="text-red-500 bg-red-50 px-4 py-3 rounded-md border border-red-100 text-sm break-words">
          {error}
        </div>
      )}
      {success && (
        <div className="text-green-600 bg-green-50 px-4 py-3 rounded-md border border-green-100 text-sm">
          Response submitted successfully!
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getSurveys } from "@/services/survey.service";
import Link from "next/link";

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveysData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSurveys();
      if (result && result.data) {
        setSurveys(result.data);
      } else {
        setSurveys([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveysData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              ← Kembali ke Home
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Survey Tersedia</h1>
            <p className="text-gray-500 text-sm">Daftar survey yang tersedia untukmu</p>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
            {error}
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
            No active surveys available at the moment.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <Link 
                href={`/surveys/${survey.id}`}
                key={survey.id} 
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all block group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                  <span className="text-sm text-gray-500 font-medium">
                    {survey.remaining_responses} left
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate" title={survey.title}>
                  {survey.title || `Survey ${survey.id?.substring(0, 8)}...`}
                </h3>
                
                {survey.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2" title={survey.description}>
                    {survey.description}
                  </p>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <span className="block mb-1">Creator: {survey.creator_id?.substring(0, 8)}...</span>
                  {survey.reward_per_response && (
                    <span className="block font-semibold text-blue-600">
                      Reward: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(survey.reward_per_response)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

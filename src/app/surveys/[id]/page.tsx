"use client";

import { useEffect, useState, use } from "react";
import { getSurveyById } from "@/services/survey.service";
import Link from "next/link";
import SubmitResponseButton from "@/components/ui/SubmitResponseButton";

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [survey, setSurvey] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveyDetail = async () => {
      try {
        const result = await getSurveyById(id);
        if (result && result.data) {
          setSurvey(result.data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurveyDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/surveys" className="text-blue-600 hover:underline mb-6 inline-block font-medium">
            &larr; Back to Surveys
          </Link>
          <div className="bg-red-50 text-red-600 p-6 rounded-lg border border-red-100 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Error Loading Survey</h2>
            <p>{error || "Survey not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/surveys" className="text-blue-600 hover:underline mb-6 inline-block font-medium">
          &larr; Back to Surveys
        </Link>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex justify-between items-start mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {survey.status === 'active' ? 'Active' : survey.status || 'Unknown Status'}
            </span>
            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
              {survey.remaining_responses} responses left
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{survey.title || "Untitled Survey"}</h1>
          
          {survey.description && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{survey.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Creator ID</h3>
              <p className="text-gray-900 font-mono text-sm break-all">{survey.creator_id}</p>
            </div>
            {survey.reward_per_response !== undefined && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Reward Per Response</h3>
                <p className="text-blue-600 font-bold text-lg">{survey.reward_per_response} Points</p>
              </div>
            )}
            {survey.total_responses !== undefined && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Responses Target</h3>
                <p className="text-gray-900 font-medium">{survey.total_responses}</p>
              </div>
            )}
            {survey.created_at && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Created At</h3>
                <p className="text-gray-900 text-sm">
                  {new Date(survey.created_at).toLocaleDateString(undefined, { 
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' 
                  })}
                </p>
              </div>
            )}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Survey ID</h3>
              <p className="text-gray-500 font-mono text-xs break-all">{survey.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

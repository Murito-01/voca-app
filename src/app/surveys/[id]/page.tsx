"use client";

import { useEffect, useState, use } from "react";
import { getSurveyById, getSurveyQuestions } from "@/services/survey.service";
import Link from "next/link";
import SubmitResponseButton from "@/components/ui/SubmitResponseButton";

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [survey, setSurvey] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [surveyResult, questionsResult] = await Promise.all([
          getSurveyById(id),
          getSurveyQuestions(id)
        ]);
        
        if (surveyResult && surveyResult.data) {
          setSurvey(surveyResult.data);
        }
        if (questionsResult && questionsResult.data) {
          setQuestions(questionsResult.data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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
            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full transition-all">
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
                <p className="text-blue-600 font-bold text-lg">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(survey.reward_per_response)}
                </p>
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

        {/* Survey Questions Section */}
        {questions && questions.length > 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Questions</h2>
            <div className="space-y-6">
              {questions.map((q: any, index: number) => (
                <div key={q.id} className="p-5 border border-gray-100 rounded-lg bg-gray-50">
                  <p className="font-medium text-gray-900 mb-4">
                    {index + 1}. {q.question_text}
                  </p>
                  
                  {q.question_type === 'text' && (
                    <input 
                      type="text" 
                      placeholder="Your answer..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                  )}
                  
                  {q.question_type === 'radio' && q.options && (
                    <div className="space-y-3">
                      {q.options.map((opt: any) => (
                        <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="radio" 
                            name={`question-${q.id}`} 
                            value={opt.id}
                            className="w-4 h-4 text-blue-600 bg-white border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800">{opt.option_text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'checkbox' && q.options && (
                    <div className="space-y-3">
                      {q.options.map((opt: any) => (
                        <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            name={`question-${q.id}`} 
                            value={opt.id}
                            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800">{opt.option_text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Submit a Response</h2>
          <SubmitResponseButton 
            surveyId={survey.id} 
            hasSubmitted={survey.has_submitted}
            onSuccessCallback={() => {
              setSurvey((prev: any) => ({
                ...prev,
                remaining_responses: Math.max(0, prev.remaining_responses - 1),
                has_submitted: true
              }));
            }} 
          />
        </div>
      </div>
    </div>
  );
}

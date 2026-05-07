"use client";

import { useEffect, useState, use } from "react";
import { getSurveyById, getSurveyQuestions } from "@/services/survey.service";
import { getResponseById } from "@/services/response.service";
import Link from "next/link";
import SubmitResponseButton, { type SubmitResponseResult } from "@/components/ui/SubmitResponseButton";
import SubmissionFeedback from "@/components/ui/SubmissionFeedback";

export default function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [survey, setSurvey] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [startedAt, setStartedAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitResponseResult | null>(null);

  const handleStartSurvey = () => {
    setStartedAt(new Date().toISOString());
  };

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

  const isFormValid = () => {
    if (questions.length === 0) return true;
    
    return questions.every(q => {
      const answer = answers[q.id];
      if (q.question_type === 'text') {
        return typeof answer === 'string' && answer.trim().length > 0;
      }
      if (q.question_type === 'radio') {
        return typeof answer === 'string' && answer.length > 0;
      }
      if (q.question_type === 'checkbox') {
        return Array.isArray(answer) && answer.length > 0;
      }
      return false;
    });
  };

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

          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              <strong>Penting:</strong> Berikan jawaban yang jujur dan berkualitas. Respons yang buruk atau asal-asalan akan mengakibatkan pengurangan jumlah reward yang kamu terima.
            </p>
          </div>
          
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

        {!startedAt && !survey.has_submitted ? (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-5">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Siap untuk memulai?</h2>
            <p className="text-gray-500 mb-8 max-w-md text-sm leading-relaxed">
              Luangkan waktu sejenak untuk membaca detail survey di atas. Setelah kamu siap, klik tombol mulai. Timer akan berjalan, dan menjawab pertanyaan secara terburu-buru dapat memengaruhi skor dan reputasi kamu!
            </p>
            <button 
              onClick={handleStartSurvey}
              className="px-8 py-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              Ya, Mulai Survey
            </button>
          </div>
        ) : (
          <>
            {/* Survey Questions Section */}
            {questions && questions.length > 0 && (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
                <fieldset disabled={survey.has_submitted || isSubmitting} className="group">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 group-disabled:opacity-70">Pertanyaan</h2>
                  <div className="space-y-6 group-disabled:opacity-70">
                  {questions.map((q: any, index: number) => (
                    <div key={q.id} className="p-5 border border-gray-100 rounded-lg bg-gray-50">
                      <p className="font-medium text-gray-900 mb-4">
                        {index + 1}. {q.question_text}
                      </p>
                      
                      {q.question_type === 'text' && (
                        <input 
                          type="text" 
                          placeholder="Jawaban kamu..."
                          value={(answers[q.id] as string) || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
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
                                checked={answers[q.id] === opt.id}
                                onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
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
                                checked={Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).includes(opt.id) : false}
                                onChange={(e) => {
                                  const currentAnswers = (answers[q.id] as string[]) || [];
                                  if (e.target.checked) {
                                    setAnswers(prev => ({ ...prev, [q.id]: [...currentAnswers, opt.id] }));
                                  } else {
                                    setAnswers(prev => ({ ...prev, [q.id]: currentAnswers.filter(id => id !== opt.id) }));
                                  }
                                }}
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
                </fieldset>
              </div>
            )}

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Kirim Respons</h2>
              
              {!isFormValid() && !survey.has_submitted && (
                <p className="text-amber-600 text-sm mb-4 bg-amber-50 p-3 rounded-md border border-amber-100">
                  Harap jawab semua pertanyaan sebelum mengirim.
                </p>
              )}

              <SubmitResponseButton 
                surveyId={survey.id} 
                hasSubmitted={survey.has_submitted}
                disabled={!isFormValid()}
                answers={answers}
                startedAt={startedAt}
                onSubmitStart={() => setIsSubmitting(true)}
                onSubmitError={() => setIsSubmitting(false)}
                onSuccessCallback={async (result) => {
                  try {
                    // Fetch the full rich data from the detail API
                    const detailRes = await getResponseById(result.id);
                    if (detailRes && detailRes.data) {
                      setSubmissionResult(detailRes.data);
                    } else {
                      // Fallback to basic result if detail fetch fails
                      setSubmissionResult(result);
                    }
                  } catch (err) {
                    console.error("Failed to fetch response details:", err);
                    setSubmissionResult(result);
                  }
                  
                  setIsSubmitting(false);
                  setSurvey((prev: any) => ({
                    ...prev,
                    remaining_responses: Math.max(0, prev.remaining_responses - 1),
                    has_submitted: true
                  }));
                }} 
              />
            </div>

            {submissionResult && (
              <SubmissionFeedback 
                result={submissionResult} 
                surveyTitle={survey.title} 
                onClose={() => setSubmissionResult(null)} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

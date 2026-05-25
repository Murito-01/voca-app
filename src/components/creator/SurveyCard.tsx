import Link from 'next/link';
import { Survey } from '@/types/survey.types';

interface SurveyCardProps {
    survey: Survey;
}

export default function SurveyCard({ survey: s }: SurveyCardProps) {
    const completed = s.total_responses - s.remaining_responses;
    const progress = s.total_responses > 0
        ? Math.round((completed / s.total_responses) * 100)
        : 0;
    const totalSpend = completed * s.reward_per_response;

    return (
        <Link
            href={`/my-surveys/${s.id}`}
            className="block min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:p-5"
        >
            {/* Title & Status */}
            <div className="mb-4 flex items-start justify-between gap-4">
                <h2 className="min-w-0 text-lg font-semibold leading-tight text-gray-900">
                    {s.title || 'Untitled Survey'}
                </h2>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'active' ? 'bg-green-100 text-green-800' :
                        s.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        s.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        {s.status === 'active' ? 'Aktif' : 
                         s.status === 'paused' ? 'Paused' :
                         s.status === 'completed' ? 'Completed' : 'Draft'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.allow_extended_responses
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-500'
                    }`}>
                        {s.allow_extended_responses ? '🚀 Extended' : '🔒 Fixed'}
                    </span>
                </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600 font-medium">
                        Progress Responden
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                        {completed} / {s.total_responses}
                        <span className="text-gray-400 font-normal ml-1">({progress}%)</span>
                    </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-3">
                <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Reward/Responden</p>
                    <p className="text-sm font-semibold text-blue-600">
                        {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0
                        }).format(s.reward_per_response)}
                    </p>
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Sisa Slot</p>
                    <p className="text-sm font-semibold text-gray-800">
                        {s.remaining_responses}
                    </p>
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Total Dikeluarkan</p>
                    <p className="text-sm font-semibold text-gray-800">
                        {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0
                        }).format(totalSpend)}
                    </p>
                </div>
            </div>
        </Link>
    );
}

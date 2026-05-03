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
            className="block bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
        >
            {/* Title & Status */}
            <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                    {s.title || 'Untitled Survey'}
                </h2>
                <span className={`ml-3 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    s.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                }`}>
                    {s.status === 'active' ? 'Aktif' : s.status || 'Unknown'}
                </span>
            </div>

            {/* Progress */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
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
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div>
                    <p className="text-xs text-gray-500 mb-0.5">Reward/Responden</p>
                    <p className="text-sm font-semibold text-blue-600">
                        {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0
                        }).format(s.reward_per_response)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 mb-0.5">Sisa Slot</p>
                    <p className="text-sm font-semibold text-gray-800">
                        {s.remaining_responses}
                    </p>
                </div>
                <div>
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

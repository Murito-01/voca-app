'use client'

import { useEffect, useState } from 'react'
import { getCreatorDashboardMetrics } from '@/services/survey.service'

interface DashboardMetrics {
    budget: {
        total: number;
        used: number;
        remaining: number;
    };
    responses: {
        valid: number;
        low_quality: number;
        rejected: number;
        total: number;
        valid_rate: number;
    };
    burn_rate: {
        burn_rate_per_sec: number;
        estimated_minutes_left: number | null;
    };
}

export default function CreatorDashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await getCreatorDashboardMetrics();
                setMetrics(response.data);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Gagal memuat metrik');
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    if (loading) {
        return (
            <div className="mb-6 animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 h-5 w-48 rounded bg-gray-200"></div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <div className="h-20 rounded-lg bg-gray-100"></div>
                    <div className="h-20 rounded-lg bg-gray-100"></div>
                    <div className="h-20 rounded-lg bg-gray-100"></div>
                    <div className="h-20 rounded-lg bg-gray-100"></div>
                    <div className="h-20 rounded-lg bg-gray-100"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error}
            </div>
        );
    }

    if (!metrics) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDuration = (minutes: number) => {
        const hours = minutes / 60;
        if (hours >= 24) {
            const d = Math.floor(hours / 24);
            const remainingHours = Math.floor(hours % 24);
            const remainingMinutes = Math.round((hours % 1) * 60);
            
            if (remainingHours > 0) {
                return `${d} Hari ${remainingHours} Jam`;
            } else if (remainingMinutes > 0) {
                return `${d} Hari ${remainingMinutes} Menit`;
            } else {
                return `${d} Hari`;
            }
        } else {
            const h = Math.floor(hours);
            const m = Math.round((hours % 1) * 60);
            if (h > 0) {
                if (m > 0) return `${h} Jam ${m} Menit`;
                return `${h} Jam`;
            }
            return `${m} Menit`;
        }
    };

    const burnRatePerSec = Number(metrics.burn_rate?.burn_rate_per_sec || 0);
    const burnRatePerMinute = burnRatePerSec * 60;
    const estimatedMinutesLeft = metrics.burn_rate?.estimated_minutes_left;
    const hasNoSpendingActivity = burnRatePerSec === 0;
    const cannotPredictTimeLeft = estimatedMinutesLeft === null;

    return (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
                Dashboard Overview
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {/* Budget Total */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">Total Budget</p>
                    <p className="truncate text-2xl font-bold text-blue-900">{formatCurrency(metrics.budget.total)}</p>
                </div>

                {/* Used Budget */}
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <p className="text-orange-700 text-xs font-semibold uppercase tracking-wider mb-1">Used Budget</p>
                    <p className="truncate text-2xl font-bold text-orange-900">{formatCurrency(metrics.budget.used)}</p>
                </div>

                {/* Remaining / Locked Budget */}
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-green-700 text-xs font-semibold uppercase tracking-wider mb-1">Locked Budget</p>
                    <p className="truncate text-2xl font-bold text-green-900">{formatCurrency(metrics.budget.remaining)}</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Responses</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.responses.total}</p>
                    <p className="mt-1 text-xs text-gray-500">
                        {metrics.responses.valid} valid · {metrics.responses.low_quality} low · {metrics.responses.rejected} rejected
                    </p>
                </div>

                {/* Valid Rate */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Valid Rate</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${
                            metrics.responses.valid_rate >= 80 ? 'text-green-600' :
                            metrics.responses.valid_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                            {metrics.responses.valid_rate.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-700">Burn Rate</p>
                        {hasNoSpendingActivity ? (
                            <p className="text-sm font-semibold text-orange-800">Belum ada aktivitas</p>
                        ) : (
                            <>
                                <p className="truncate text-xl font-bold text-orange-900">
                                    {formatCurrency(burnRatePerMinute)} / menit
                                </p>
                                <p className="text-[11px] text-orange-700 mt-1">
                                    Burn rate dihitung dari spending dan waktu aktif survey
                                </p>
                            </>
                        )}
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-purple-700">Estimasi Budget Habis</p>
                        {cannotPredictTimeLeft ? (
                            <p className="text-sm font-semibold text-purple-800">Tidak bisa diprediksi</p>
                        ) : (
                            <>
                                <p className="truncate text-xl font-bold text-purple-900">
                                    {formatDuration(Number(estimatedMinutesLeft))}
                                </p>
                                <p className="text-[11px] text-purple-700 mt-1">
                                    Berdasarkan burn rate saat ini
                                </p>
                            </>
                        )}
                    </div>
            </div>
        </div>
    );
}

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
            } catch (err: any) {
                setError(err.message || 'Gagal memuat metrik');
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm border border-red-100">
                ⚠️ {error}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📊</span> Dashboard Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Budget Total */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
                    <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">Total Budget</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(metrics.budget.total)}</p>
                </div>

                {/* Used Budget */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 shadow-sm">
                    <p className="text-orange-700 text-xs font-semibold uppercase tracking-wider mb-1">Used Budget</p>
                    <p className="text-2xl font-bold text-orange-900">{formatCurrency(metrics.budget.used)}</p>
                </div>

                {/* Remaining / Locked Budget */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-sm">
                    <p className="text-green-700 text-xs font-semibold uppercase tracking-wider mb-1">Locked Budget</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(metrics.budget.remaining)}</p>
                    <p className="text-[10px] text-green-600 mt-1 font-medium">Sisa dana di survey aktif</p>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>👥</span> Kualitas Respons
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-xs font-medium mb-1">Total Responses</p>
                        <p className="text-xl font-bold text-gray-900">{metrics.responses.total}</p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-green-700 text-xs font-medium mb-1">Valid</p>
                        <p className="text-xl font-bold text-green-800">{metrics.responses.valid}</p>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-yellow-700 text-xs font-medium mb-1">Low Quality</p>
                        <p className="text-xl font-bold text-yellow-800">{metrics.responses.low_quality}</p>
                    </div>

                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-red-700 text-xs font-medium mb-1">Rejected</p>
                        <p className="text-xl font-bold text-red-800">{metrics.responses.rejected}</p>
                    </div>
                </div>

                {/* Valid Rate */}
                <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div>
                        <p className="text-gray-800 font-semibold text-sm">Valid Rate</p>
                        <p className="text-xs text-gray-500">Persentase respons valid dari total</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${
                            metrics.responses.valid_rate >= 80 ? 'text-green-600' :
                            metrics.responses.valid_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                            {metrics.responses.valid_rate.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100 mt-6 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🔥</span> Burn Rate
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <p className="text-orange-700 text-xs font-medium mb-1">Kecepatan Pengeluaran</p>
                        {hasNoSpendingActivity ? (
                            <p className="text-sm font-semibold text-orange-800">Belum ada aktivitas</p>
                        ) : (
                            <>
                                <p className="text-xl font-bold text-orange-900">
                                    {formatCurrency(burnRatePerMinute)} / menit
                                </p>
                                <p className="text-[11px] text-orange-700 mt-1">
                                    Burn rate dihitung dari spending dan waktu aktif survey
                                </p>
                            </>
                        )}
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <p className="text-purple-700 text-xs font-medium mb-1">Estimasi Budget Habis</p>
                        {cannotPredictTimeLeft ? (
                            <p className="text-sm font-semibold text-purple-800">Tidak bisa diprediksi</p>
                        ) : (
                            <>
                                <p className="text-xl font-bold text-purple-900">
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
        </div>
    );
}

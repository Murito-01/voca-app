'use client'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

interface ResponderDashboardProps {
  totalEarnings: number
  totalCompleted: number
  totalDraft: number
  validCount: number
  lowQualityCount: number
  rejectedCount: number
  averageScore: number | null
}

export default function ResponderDashboard({
  totalEarnings,
  totalCompleted,
  totalDraft,
  validCount,
  lowQualityCount,
  rejectedCount,
  averageScore,
}: ResponderDashboardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📊</span> Dashboard Overview
      </h2>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-sm">
          <p className="text-green-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Total Pendapatan
          </p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(totalEarnings)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Survey Selesai
          </p>
          <p className="text-2xl font-bold text-blue-900">{totalCompleted}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200 shadow-sm">
          <p className="text-yellow-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Draft Tersimpan
          </p>
          <p className="text-2xl font-bold text-yellow-900">{totalDraft}</p>
        </div>
      </div>

      {/* Response Quality */}
      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>⭐</span> Kualitas Respons
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-xs font-medium mb-1">Total Respons</p>
            <p className="text-xl font-bold text-gray-900">{totalCompleted}</p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-green-700 text-xs font-medium mb-1">Valid</p>
            <p className="text-xl font-bold text-green-800">{validCount}</p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-yellow-700 text-xs font-medium mb-1">Low Quality</p>
            <p className="text-xl font-bold text-yellow-800">{lowQualityCount}</p>
          </div>

          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-red-700 text-xs font-medium mb-1">Rejected</p>
            <p className="text-xl font-bold text-red-800">{rejectedCount}</p>
          </div>
        </div>

        {/* Average Score */}
        <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div>
            <p className="text-gray-800 font-semibold text-sm">Rata-rata Skor</p>
            <p className="text-xs text-gray-500">Skor rata-rata dari semua respons yang dinilai</p>
          </div>
          <div className="flex items-center gap-2">
            {averageScore !== null ? (
              <span
                className={`text-xl font-bold ${
                  averageScore >= 80
                    ? 'text-green-600'
                    : averageScore >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {averageScore.toFixed(1)}
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-400">Belum ada data</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

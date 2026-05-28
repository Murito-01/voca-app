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
  totalFee: number
  totalNet: number
  totalCompleted: number
  totalDraft: number
  validCount: number
  lowQualityCount: number
  rejectedCount: number
  averageScore: number | null
}

export default function ResponderDashboard({
  totalEarnings,
  totalFee,
  totalNet,
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

      {/* Earnings Summary Header Card */}
      <div className="bg-gradient-to-br from-emerald-50 via-green-50/30 to-emerald-100/50 p-6 rounded-2xl border border-emerald-200/50 shadow-sm relative overflow-hidden mb-4">
        {/* Glowing aura effect */}
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div>
            <p className="text-emerald-800 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Total Pendapatan Bersih (Net)
            </p>
            <p className="text-3xl font-black text-emerald-950 tracking-tight">
              {formatCurrency(totalNet)}
            </p>
            <p className="text-xs text-emerald-700/80 mt-1">
              Dana bersih yang ditransfer langsung ke wallet Anda.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/75 backdrop-blur-md px-5 py-3.5 rounded-xl border border-emerald-100/60 shrink-0 shadow-xs">
            <div className="space-y-0.5">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Kotor (Gross)</p>
              <p className="text-sm font-extrabold text-gray-700">{formatCurrency(totalEarnings)}</p>
            </div>
            <div className="h-8 w-px bg-emerald-200/50" />
            <div className="space-y-0.5">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                Fee Platform (5%)
              </p>
              <p className="text-sm font-extrabold text-rose-600">-{formatCurrency(totalFee)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Completion & Draft Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 p-4 rounded-xl border border-blue-200/50 shadow-sm flex flex-col justify-between">
          <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Survey Selesai
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{totalCompleted}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/40 p-4 rounded-xl border border-yellow-200/50 shadow-sm flex flex-col justify-between">
          <p className="text-yellow-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Draft Tersimpan
          </p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">{totalDraft}</p>
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

import Link from 'next/link'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function ResponseCard({ response: r, isDraft }: { response: any; isDraft: boolean }) {
  return (
    <Link
      href={isDraft ? `/surveys/${r.survey_id}` : `/my-responses/${r.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
              {r.title || 'Untitled Survey'}
            </h2>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                r.status === 'valid'
                  ? 'bg-green-100 text-green-700'
                  : r.status === 'low_quality'
                    ? 'bg-orange-100 text-orange-700'
                    : r.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : r.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
              }`}
            >
              {r.status || 'Pending'}
            </span>
            {!isDraft && r.score !== null && r.score !== undefined && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Score: {r.score}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {isDraft ? 'Disimpan pada: ' : 'Dikerjakan pada: '}
            {new Date(r.created_at).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">
            {isDraft ? 'Potensi Reward' : 'Reward Didapat'}
          </p>
          <p
            className={`text-lg font-bold ${
              r.reward_final > 0 && !isDraft ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {formatCurrency(isDraft ? r.reward : r.reward_final || 0)}
          </p>
          {!isDraft && r.reward_final > 0 && (
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              Net: {formatCurrency(r.reward_final * 0.95)}
            </p>
          )}
          {!isDraft && r.reward_final !== r.reward && r.reward > 0 && (
            <p className="text-[10px] text-gray-400 line-through">
              {formatCurrency(r.reward)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

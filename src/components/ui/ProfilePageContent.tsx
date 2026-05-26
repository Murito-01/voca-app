'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  gender: 'male' | 'female' | null
  age: number | null
  job: string | null
  reputation_score: number
  created_at: string
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}

function ReputationBadge({ score }: { score: number }) {
  let label = 'Sempurna'
  let colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'
  let icon = '🏆'

  if (score < 50) {
    label = 'Rendah'
    colorClass = 'bg-red-100 text-red-700 border-red-200'
    icon = '⚠️'
  } else if (score < 80) {
    label = 'Cukup'
    colorClass = 'bg-amber-100 text-amber-700 border-amber-200'
    icon = '📊'
  } else if (score < 100) {
    label = 'Baik'
    colorClass = 'bg-blue-100 text-blue-700 border-blue-200'
    icon = '✅'
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

export default function ProfilePageContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const successTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Form state
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [age, setAge] = useState<string>('')
  const [job, setJob] = useState<string>('')

  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchWithAuth('/api/profile')
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Gagal memuat profil')
        }
        const json = await res.json()
        if (!cancelled) {
          setProfile(json.data)
          setGender(json.data.gender ?? '')
          setAge(json.data.age !== null ? String(json.data.age) : '')
          setJob(json.data.job ?? '')
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [])

  // Detect form changes
  useEffect(() => {
    if (!profile) return
    const changed =
      gender !== (profile.gender ?? '') ||
      age !== (profile.age !== null ? String(profile.age) : '') ||
      job !== (profile.job ?? '')
    setIsDirty(changed)
  }, [gender, age, job, profile])

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const payload: Record<string, unknown> = {
        gender: gender === '' ? null : gender,
        age: age === '' ? null : Number(age),
        job: job.trim() === '' ? null : job.trim(),
      }

      const res = await fetchWithAuth('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Gagal menyimpan perubahan')
      }

      // Update local profile state
      setProfile(prev => prev ? {
        ...prev,
        gender: gender === '' ? null : gender as 'male' | 'female',
        age: age === '' ? null : Number(age),
        job: job.trim() === '' ? null : job.trim(),
      } : null)

      setIsDirty(false)
      setSuccessMsg('Profil berhasil disimpan!')

      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSuccessMsg(null), 3500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!profile) return
    setGender(profile.gender ?? '')
    setAge(profile.age !== null ? String(profile.age) : '')
    setJob(profile.job ?? '')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // ─── Skeleton Loading ────────────────────────────────────
  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">Kelola informasi profil dan akunmu.</p>
        </div>
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse space-y-5">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="space-y-4">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-32 ml-auto" />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <div className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-44 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      </section>
    )
  }

  // ─── Error State ────────────────────────────────────────
  if (error && !profile) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">Kelola informasi profil dan akunmu.</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Kelola informasi profil dan akunmu.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Form Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-5 pb-4 border-b border-gray-100">
              Informasi Profil
            </h2>

            <div className="space-y-5">
              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-gray-400">Email tidak dapat diubah.</p>
              </div>

              {/* Gender & Age row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-shadow appearance-none cursor-pointer"
                  >
                    <option value="">Pilih gender...</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Usia
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Masukkan usia..."
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-shadow"
                  />
                </div>
              </div>

              {/* Job */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Pekerjaan
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Masukkan pekerjaan..."
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-shadow"
                />
              </div>
            </div>

            {/* Error / Success Feedback */}
            {error && (
              <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {successMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-5 border-t border-gray-100">
              {isDirty && (
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batalkan Perubahan
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  saving || !isDirty
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Reputation & Info Cards */}
        <div className="lg:col-span-1 space-y-6">
          {/* Reputation Card */}
          {profile && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0 select-none">
                  {profile.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{profile.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Member sejak {formatDate(profile.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Reputasi</p>
                  <p className="text-3xl font-extrabold text-gray-900 leading-none mt-1">{profile.reputation_score}</p>
                </div>
                <ReputationBadge score={profile.reputation_score} />
              </div>
            </div>
          )}

          {/* Reputation Info */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">
            <p className="font-semibold mb-2 flex items-center gap-1.5 text-blue-900">
              <span>ℹ️</span> Tentang Skor Reputasi
            </p>
            <p className="text-xs leading-relaxed text-blue-700">
              Skor reputasi dimulai dari <strong>100</strong> dan mencerminkan kualitas responmu.
              Jawaban yang asal-asalan atau gagal attention check akan mengurangi skor.
              Skor di bawah <strong>50</strong> berpotensi mengurangi reward yang kamu terima.
              Pertahankan skor tinggi untuk mendapatkan bonus reward!
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}


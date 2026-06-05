import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    let user_id: string | null = null
    let userProfile: { gender: string | null; age: number | null; job: string | null } | null = null

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        user_id = user.id

        // Fetch profil user untuk keperluan filter targeting
        const { data: profile } = await supabase
          .from('users')
          .select('gender, age, job')
          .eq('id', user_id)
          .single()

        if (profile) {
          userProfile = profile
        }
      }
    }

    let query = supabase
      .from('surveys')
      .select('*')
      .eq('status', 'active')
      .gt('remaining_responses', 0)

    // ❗ exclude survey milik sendiri
    if (user_id) {
      query = query.neq('creator_id', user_id)
    }

    const { data, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    let filteredData = data ?? []

    // Filter out surveys the user has already responded to
    if (user_id && filteredData.length > 0) {
      const { data: responses } = await supabase
        .from('responses')
        .select('survey_id')
        .eq('user_id', user_id)
        .neq('status', 'draft')  // drafts don't count as "already responded"

      if (responses && responses.length > 0) {
        const respondedIds = new Set(responses.map(r => r.survey_id))
        filteredData = filteredData.filter((survey: any) => !respondedIds.has(survey.id))
      }
    }

    // Filter berdasarkan targeting survey
    if (filteredData.length > 0) {
      const surveyIds = filteredData.map((s: any) => s.id)

      const { data: targetingRows } = await supabase
        .from('survey_targeting')
        .select('survey_id, gender, age_min, age_max, jobs')
        .in('survey_id', surveyIds)

      if (targetingRows && targetingRows.length > 0) {
        const targetingMap = new Map<string, any>()
        for (const row of targetingRows) {
          targetingMap.set(row.survey_id, row)
        }

        filteredData = filteredData.filter((survey: any) => {
          const targeting = targetingMap.get(survey.id)

          // Survey tanpa targeting = semua boleh mengisi
          if (!targeting) return true

          const { gender: tGender, age_min, age_max, jobs } = targeting

          // Filter gender: null = semua
          if (tGender !== null && tGender !== undefined) {
            const userGender = userProfile?.gender ?? null
            if (!userGender || userGender !== tGender) return false
          }

          // Filter usia: null = tidak ada batas
          if (age_min !== null && age_min !== undefined) {
            const userAge = userProfile?.age ?? null
            if (userAge === null || userAge < age_min) return false
          }
          if (age_max !== null && age_max !== undefined) {
            const userAge = userProfile?.age ?? null
            if (userAge === null || userAge > age_max) return false
          }

          // Filter pekerjaan: null/kosong = semua
          if (jobs && Array.isArray(jobs) && jobs.length > 0) {
            const userJob = userProfile?.job ?? null
            if (!userJob) return false
            // "Lainnya" di targeting cocok dengan semua job di luar daftar tetap
            const FIXED_JOBS = ['Mahasiswa', 'Pelajar', 'Karyawan', 'Freelancer', 'Wirausaha',
              'Ibu rumah tangga', 'PNS', 'Profesional', 'Tidak bekerja']
            const jobMatch = jobs.includes(userJob) ||
              (jobs.includes('Lainnya') && !FIXED_JOBS.includes(userJob))
            if (!jobMatch) return false
          }

          return true
        })
      }
    }

    return Response.json({ data: filteredData })

  } catch {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
export interface SurveyInsightParams {
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  reward: number;
  recommended_reward: number;
  responses: number;
  valid_rate?: number;
  low_quality_rate?: number;
  avg_duration?: number;
  expected_duration?: number;
  isDataEnough?: boolean;
  hoursToFinish?: number;
}

export interface SurveyInsightResult {
  type: "good" | "warning" | "danger";
  title: string;
  message: string;
  suggestion?: string;
}

export function generateSurveyInsight(params: SurveyInsightParams): SurveyInsightResult | null {
  const {
    status,
    reward,
    recommended_reward,
    responses,
    valid_rate,
    low_quality_rate,
    isDataEnough,
    hoursToFinish
  } = params;

  if (status === 'draft') {
    if (reward < recommended_reward) {
      return {
        type: "warning",
        title: "Reward di bawah rekomendasi",
        message: "Risiko: Response masuk lambat, Kualitas jawaban rendah",
        suggestion: "Saran: Gunakan rekomendasi final"
      };
    } else {
      return {
        type: "good",
        title: "Reward sudah optimal",
        message: "Estimasi response stabil",
        suggestion: "Tidak perlu perubahan"
      };
    }
  }

  if (status === 'active') {
    if (!isDataEnough) {
      return null;
    }
    
    if (hoursToFinish !== undefined && hoursToFinish < 2) {
      return {
        type: "good",
        title: "Survey berjalan sangat cepat",
        message: "Reward cukup menarik",
        suggestion: "Tidak perlu perubahan"
      };
    } else if (hoursToFinish !== undefined && hoursToFinish <= 6) {
      return {
        type: "good",
        title: "Survey berjalan stabil",
        message: "Kecepatan wajar",
        suggestion: "Pantau secara berkala"
      };
    } else {
      return {
        type: "warning",
        title: "Survey berjalan lambat",
        message: "Kecepatan di bawah ekspektasi",
        suggestion: "Pertimbangkan menambah reward"
      };
    }
  }

  if (status === 'completed') {
    if (low_quality_rate !== undefined && low_quality_rate > 0.4) {
      return {
        type: "danger",
        title: "Kualitas response rendah",
        message: "Banyak response dengan durasi pengisian mencurigakan atau gagal validasi",
        suggestion: "Saran: Naikkan reward atau tambahkan validasi form"
      };
    } else if (valid_rate !== undefined && valid_rate >= 0.7) {
      return {
        type: "good",
        title: "Performa survey baik",
        message: "Sebagian besar response valid dan memenuhi standar",
        suggestion: "Pertahankan strategi ini untuk survey berikutnya"
      };
    } else {
      return {
        type: "warning",
        title: "Performa survey cukup",
        message: "Banyak response ditolak karena kualitas",
        suggestion: "Tinjau ulang pertanyaan atau saring responden"
      };
    }
  }

  return null;
}

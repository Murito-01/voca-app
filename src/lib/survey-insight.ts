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
  type: "info" | "good" | "normal" | "warning" | "danger";
  title: string;
  message: string;
  suggestion?: string;
  impact?: string;
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
    if (!isDataEnough || hoursToFinish === undefined) {
      return {
        type: "info",
        title: "Belum cukup data",
        message: responses > 0
          ? "Menunggu beberapa response tambahan agar pola performa lebih terbaca"
          : "Menunggu responden pertama...",
        suggestion: "Insight akan muncul setelah beberapa response masuk"
      };
    }
    
    if (hoursToFinish < 2) {
      return {
        type: "good",
        title: "Survey berjalan stabil",
        message: "Response masuk dengan cepat dan konsisten",
        suggestion: "Reward menarik dan response lancar",
        impact: "Survey berpeluang selesai lebih cepat dari estimasi."
      };
    } else if (hoursToFinish <= 6) {
      return {
        type: "normal",
        title: "Survey berjalan normal",
        message: "Response masuk secara konsisten",
        suggestion: "Tidak ada indikasi masalah saat ini",
        impact: "Survey masih berada dalam ritme penyelesaian yang wajar."
      };
    } else if (hoursToFinish <= 10) {
      return {
        type: "warning",
        title: "Survey berjalan lambat",
        message: "Response masuk lebih lambat dari estimasi",
        suggestion: "Kemungkinan reward kurang menarik",
        impact: "Survey mungkin membutuhkan waktu lebih lama untuk selesai."
      };
    } else {
      return {
        type: "danger",
        title: "Survey hampir tidak bergerak",
        message: "Sangat sedikit response yang masuk",
        suggestion: "Kemungkinan reward terlalu rendah atau target terlalu sempit",
        impact: "Survey berisiko membutuhkan waktu jauh lebih lama untuk selesai."
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

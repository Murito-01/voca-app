'use client'

import AuthGuard from '@/components/ui/AuthGuard'

export default function MySurveysLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}

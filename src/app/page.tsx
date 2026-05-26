"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/ui/LogoutButton";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const lastWorkspace = localStorage.getItem('lastWorkspace');
        if (lastWorkspace === 'creator') {
          setIsRedirecting(true);
          router.push('/creator');
          return;
        } else if (lastWorkspace === 'responder') {
          setIsRedirecting(true);
          router.push('/responder');
          return;
        }
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const lastWorkspace = localStorage.getItem('lastWorkspace');
        if (lastWorkspace === 'creator') {
          setIsRedirecting(true);
          router.push('/creator');
        } else if (lastWorkspace === 'responder') {
          setIsRedirecting(true);
          router.push('/responder');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Loading or redirecting state
  if (loading || isRedirecting) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-lg animate-pulse">
            V
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-2">Preparing Workspace</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gray-50">
      <div className="w-full max-w-4xl flex flex-col items-center gap-8 md:gap-12">
        {/* Welcome Header */}
        <div className="text-center space-y-3 max-w-xl">
          <div className="h-12 w-12 rounded-xl bg-blue-600 mx-auto flex items-center justify-center text-white text-xl font-black shadow-md mb-2">
            V
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Welcome to Voca</h1>
          {user && (
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
              Logged in as {user.email}
            </div>
          )}
          <p className="text-gray-500 text-lg leading-relaxed">
            Choose your workspace experience below to continue.
          </p>
        </div>

        {/* Visual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Creator Card */}
          <div className="group bg-white p-8 rounded-2xl border border-gray-150 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-100/60 px-2.5 py-0.5 text-xs font-semibold text-blue-800 mb-2">
                  Deploy & Analyze
                </span>
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Creator Workspace</h2>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  Design beautiful interactive surveys, target specific respondent profiles, verify entries with custom attention checks, and view smart analytical reports.
                </p>
              </div>
            </div>
            
            <Link
              href="/creator"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Enter Creator Mode
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Respondent Card */}
          <div className="group bg-white p-8 rounded-2xl border border-gray-150 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
              </div>
              <div>
                <span className="inline-flex items-center rounded-full bg-emerald-100/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 mb-2">
                  Share & Earn
                </span>
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Respondent Workspace</h2>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  Browse open surveys tailored to you, provide high-quality responses, complete attention-verification steps, and earn instant rewards straight to your wallet.
                </p>
              </div>
            </div>

            <Link
              href="/responder"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Enter Respondent Mode
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Global Authenticator Footer Actions */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm mt-4">
          {!user ? (
            <div className="flex gap-4 w-full">
              <Link
                href="/login"
                className="flex-1 text-center py-2.5 bg-white text-gray-700 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm active:scale-[0.98] text-sm"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="flex-1 text-center py-2.5 bg-white text-gray-700 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm active:scale-[0.98] text-sm"
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="w-full flex justify-center border-t border-gray-200/80 pt-6">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

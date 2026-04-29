"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/ui/LogoutButton";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-6 max-w-md text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Voca App</h1>
          {user && <p className="text-sm text-blue-600 font-medium mb-2">Logged in as {user.email}</p>}
          <p className="text-gray-500 text-base">Explore available surveys, submit responses, and earn rewards easily.</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/surveys"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md active:scale-95 w-full"
          >
            View Surveys
          </Link>

          <Link href="/my-surveys"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md active:scale-95 w-full"
          >
            My Surveys
          </Link>

          <Link href="/create-survey"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md active:scale-95 w-full"
          >
            Create Survey
          </Link>

          {!loading && (
            <>
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md active:scale-95 w-full"
                  >
                    Login
                  </Link>

                  <Link
                    href="/register"
                    className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md active:scale-95 w-full"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <LogoutButton />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}


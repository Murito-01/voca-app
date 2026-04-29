"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/");
      router.refresh(); // Refresh to update server-side state if needed
    } else {
      console.error("Error logging out:", error.message);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-6 py-3 bg-red-50 text-red-600 font-medium rounded-lg border border-red-100 hover:bg-red-100 transition-colors shadow-sm active:scale-95 w-full"
    >
      Logout
    </button>
  );
}

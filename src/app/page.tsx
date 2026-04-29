import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-6 max-w-md text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Voca App</h1>
          <p className="text-gray-500 text-base">Explore available surveys, submit responses, and earn rewards easily.</p>
        </div>
        
        <div className="flex flex-col gap-3 w-full">
          <Link 
            href="/surveys" 
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md active:scale-95 w-full"
          >
            View Surveys
          </Link>

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
        </div>
      </div>
    </main>
  );
}

import SubmitResponseButton from "@/components/ui/SubmitResponseButton";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Test Component</h1>
          <p className="text-gray-500 text-sm">Click the button below to test the submission API.</p>
        </div>
        
        <SubmitResponseButton />
      </div>
    </main>
  );
}

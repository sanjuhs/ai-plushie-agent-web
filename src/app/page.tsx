import Link from "next/link";

export default function Home() {
  const pages = [
    {
      title: "🐭 Squeaky the Plushie",
      description: "Interactive AI companion plushie that talks to children",
      href: "/openai-plushie-unicorn",
      status: "Ready",
      color: "from-pink-400 to-purple-400",
    },
    {
      title: "🤖 Gemini Live Kit",
      description: "Real-time voice conversation with Gemini AI",
      href: "/gemini-test01",
      status: "Ready",
      color: "from-blue-400 to-cyan-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🚀 AI Companion Plushie
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome to the AI Companion Plushie project! Choose from the
            available pages below to explore different AI implementations and
            features.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
          {pages.map((page, index) => (
            <Link href={page.href} key={index}>
              <div
                className={`group relative overflow-hidden rounded-xl bg-gradient-to-r ${page.color} p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">
                      {page.title}
                    </h2>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        page.status === "Ready"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {page.status}
                    </span>
                  </div>
                  <p className="text-white/90 mb-4">{page.description}</p>
                  <div className="flex items-center text-white/80 group-hover:text-white transition-colors">
                    <span className="text-sm font-medium">Launch App</span>
                    <svg
                      className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>

                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white"></div>
                  <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white"></div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Add new page section */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              🛠️ Adding New Pages
            </h3>
            <p className="text-gray-600 text-sm">
              To add a new page to this navigation, simply create a new folder
              in the{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                src/app/
              </code>{" "}
              directory with a{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                page.tsx
              </code>{" "}
              file, then update the{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                pages
              </code>{" "}
              array in this file to include your new page.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Built with Next.js, React, and lots of ❤️</p>
        </div>
      </div>
    </div>
  );
}

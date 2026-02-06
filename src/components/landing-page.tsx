"use client";
import { useState } from "react";
import Link from "next/link";
import { Database, Sparkles, Zap, Code, ArrowRight, Github, Star, Rocket } from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [email, setEmail] = useState("");

  const handleGetStarted = () => {
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 relative overflow-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap');

        * {
          font-family: "Space Grotesk", sans-serif;
          font-optical-sizing: auto;
        }

        .font-display {
          font-weight: 700;
        }

        .font-heading {
          font-weight: 600;
        }

        .font-body {
          font-weight: 400;
        }
      `}</style>

      {/* Decorative Shapes - More vibrant */}
      <div className="absolute top-20 left-10 w-28 h-28 bg-gradient-to-br from-red-400 to-pink-500 border-4 border-black nb-shadow rotate-12 animate-float" />
      <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 border-4 border-black nb-shadow animate-float-delayed animate-pulse-slow" />
      <div className="absolute bottom-40 left-20 w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 border-4 border-black nb-shadow rotate-45 animate-bounce-slow" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
      <div className="absolute bottom-20 right-40 w-24 h-24 bg-gradient-to-br from-lime-400 to-green-400 border-4 border-black nb-shadow rotate-12 animate-float" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-4 border-black nb-shadow animate-spin-slow" />
      <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-500 border-4 border-black nb-shadow -rotate-12 animate-wiggle" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
      <div className="absolute top-60 right-1/4 w-14 h-14 bg-gradient-to-br from-rose-400 to-red-500 border-4 border-black nb-shadow animate-float-delayed">
        <div className="w-full h-full flex items-center justify-center">
          <Star className="text-white" fill="white" size={20} />
        </div>
      </div>
      <div className="absolute bottom-60 left-1/3 w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 border-4 border-black nb-shadow rotate-45 animate-bounce-slow">
        <div className="w-full h-full flex items-center justify-center -rotate-45">
          <Sparkles className="text-white" fill="white" size={20} />
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-4 border-black bg-white backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 via-pink-400 to-purple-400 border-4 border-black nb-shadow animate-gradient">
              <Database size={28} className="text-black" />
            </div>
            <span className="text-2xl font-display tracking-tight">Schema Designer</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 font-body">
            <a href="#features" className="font-bold text-black hover:text-purple-600 transition-all hover:scale-110">
              Features
            </a>
            <a href="#how-it-works" className="font-bold text-black hover:text-pink-600 transition-all hover:scale-110">
              How It Works
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="font-bold text-black hover:text-cyan-600 transition-all hover:scale-110 flex items-center gap-2">
              <Github size={20} />
              GitHub
            </a>
          </nav>

          <Link
            href="/dashboard"
            className="nb-btn bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 hover:from-yellow-400 hover:via-pink-400 hover:to-purple-400 flex items-center gap-2 font-heading transition-all hover:scale-105 hover:rotate-1"
          >
            Launch App
            <Rocket size={18} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-display mb-6 leading-tight tracking-tight">
            Easily design{" "}
            <span className="text-purple-600">
              database schemas
            </span>
            {" "}with AI
          </h1>

          <p className="text-2xl md:text-3xl text-gray-700 mb-4 font-body">
            Generate visual database schemas from natural language in seconds.
          </p>
          <p className="text-lg text-gray-700 mb-12 max-w-2xl mx-auto font-body leading-relaxed">
            Design beautiful ER diagrams, export PostgreSQL DDL, and collaborate with your team—all powered by cutting-edge AI technology.
          </p>

          {/* CTA Input */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-16">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 border-4 border-black text-lg font-body focus:outline-none focus:ring-4 focus:ring-purple-400 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
            <Link
              href="/dashboard"
              className="nb-btn bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 px-8 py-4 text-lg font-heading uppercase whitespace-nowrap text-center transition-all hover:scale-105 hover:rotate-1 flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight size={20} />
            </Link>
          </div>

          {/* Product Preview */}
          <div className="nb-card p-4 bg-white hover:translate-x-2 hover:translate-y-2 transition-transform">
            <div className="border-4 border-black bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200 aspect-video rounded-lg overflow-hidden relative shadow-inner">
              {/* Mockup Dashboard */}
              <div className="absolute inset-0 p-4 grid grid-cols-3 gap-4">
                {/* Left Panel - Chat */}
                <div className="bg-purple-200 border-4 border-black p-3">
                  <div className="text-xs font-bold uppercase mb-2">AI Assistant</div>
                  <div className="space-y-2">
                    <div className="bg-white border-2 border-black p-2 text-xs font-mono">
                      Create a blog schema...
                    </div>
                    <div className="bg-cyan-300 border-2 border-black p-2 text-xs font-mono">
                      Generated 3 tables ✓
                    </div>
                  </div>
                </div>

                {/* Center Panel - Canvas */}
                <div className="bg-white border-4 border-black p-2">
                  <div className="grid grid-cols-2 gap-2 h-full">
                    <div className="bg-yellow-300 border-2 border-black p-1">
                      <div className="text-[8px] font-bold bg-black text-white px-1">USERS</div>
                    </div>
                    <div className="bg-pink-300 border-2 border-black p-1">
                      <div className="text-[8px] font-bold bg-black text-white px-1">POSTS</div>
                    </div>
                    <div className="bg-cyan-300 border-2 border-black p-1">
                      <div className="text-[8px] font-bold bg-black text-white px-1">COMMENTS</div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Editor */}
                <div className="bg-orange-200 border-4 border-black p-3">
                  <div className="text-xs font-bold uppercase mb-2">Table Editor</div>
                  <div className="space-y-1">
                    <div className="bg-white border-2 border-black p-1 text-[8px] font-mono">
                      id: uuid
                    </div>
                    <div className="bg-white border-2 border-black p-1 text-[8px] font-mono">
                      name: text
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4">
          Why Choose <span className="text-purple-600">Schema Designer</span>?
        </h2>
        <p className="text-xl text-gray-700 text-center mb-16 font-body">The ultimate tool for database architects</p>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="nb-card p-8 bg-gradient-to-br from-cyan-300 to-blue-300 hover:translate-x-2 hover:translate-y-2 transition-all hover:rotate-1 cursor-pointer group">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-400 border-4 border-black nb-shadow flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
              <Sparkles size={36} className="text-black" />
            </div>
            <h3 className="text-3xl font-display mb-4">AI-Powered</h3>
            <p className="text-gray-900 font-body font-medium leading-relaxed text-lg">
              Describe your database in plain English and watch as AI generates a complete schema with tables, columns, and relationships.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="nb-card p-8 bg-gradient-to-br from-yellow-300 to-orange-300 hover:translate-x-2 hover:translate-y-2 transition-all hover:rotate-1 cursor-pointer group">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-400 border-4 border-black nb-shadow flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
              <Zap size={36} className="text-black" />
            </div>
            <h3 className="text-3xl font-display mb-4">Visual Canvas</h3>
            <p className="text-gray-900 font-body font-medium leading-relaxed text-lg">
              Drag and drop tables on an interactive canvas. See relationships visually with beautiful Neubrutalism design.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="nb-card p-8 bg-gradient-to-br from-lime-300 to-green-300 hover:translate-x-2 hover:translate-y-2 transition-all hover:rotate-1 cursor-pointer group">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-400 border-4 border-black nb-shadow flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
              <Code size={36} className="text-black" />
            </div>
            <h3 className="text-3xl font-display mb-4">Export SQL</h3>
            <p className="text-gray-900 font-body font-medium leading-relaxed text-lg">
              Generate production-ready PostgreSQL DDL statements with a single click. Copy or download instantly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4">
          How It <span className="text-cyan-600">Works</span>
        </h2>
        <p className="text-xl text-gray-700 text-center mb-16 font-body">Three simple steps to perfection</p>

        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center group">
            <div className="inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-rose-500 border-4 border-black nb-shadow rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <span className="text-5xl font-display text-white">1</span>
              </div>
            </div>
            <h3 className="text-2xl font-display mb-3">Describe Your Schema</h3>
            <p className="text-gray-800 font-body font-medium text-lg leading-relaxed">
              Tell the AI what you want to build: <span className="font-bold text-pink-600">"Create a blog with users and posts"</span>
            </p>
          </div>

          <div className="text-center group">
            <div className="inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-black nb-shadow rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <span className="text-5xl font-display text-white">2</span>
              </div>
            </div>
            <h3 className="text-2xl font-display mb-3">AI Generates Schema</h3>
            <p className="text-gray-800 font-body font-medium text-lg leading-relaxed">
              Watch as tables, columns, and relationships appear on the <span className="font-bold text-orange-600">visual canvas</span>
            </p>
          </div>

          <div className="text-center group">
            <div className="inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 border-4 border-black nb-shadow rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all">
                <span className="text-5xl font-display text-white">3</span>
              </div>
            </div>
            <h3 className="text-2xl font-display mb-3">Export & Deploy</h3>
            <p className="text-gray-800 font-body font-medium text-lg leading-relaxed">
              Get <span className="font-bold text-cyan-600">production-ready SQL</span> and deploy to your database immediately
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="nb-card p-16 bg-yellow-200 text-center">
          <h2 className="text-4xl md:text-5xl font-display mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto">
            Join developers building better databases with AI-powered schema design.
          </p>
          <Link
            href="/dashboard"
            className="nb-btn bg-black text-white hover:bg-gray-800 px-12 py-4 text-lg font-semibold inline-flex items-center gap-2"
          >
            Start Designing Now
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t-4 border-black bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-300 border-4 border-black nb-shadow">
                <Database size={20} className="text-black" />
              </div>
              <span className="text-lg font-display">Schema Designer</span>
            </div>
            <p className="text-sm text-gray-600">
              Built with Next.js, Tambo AI, and Neubrutalism
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

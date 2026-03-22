'use client'

export default function Contact() {
  return (
    <>
      <div className="mesh-bg" />
      <div className="grid-overlay" />

      <main className="relative z-10 min-h-screen py-20 px-4">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-8 sm:p-12 shadow-2xl">
          <h1 className="text-4xl font-bold gradient-text mb-8">Contact</h1>
          
          <div className="space-y-10">
            <section>
              <p className="text-slate-300 text-lg leading-relaxed">
                <strong className="text-white">img64</strong> is an open-source tool built for developers. 
                The best way to get in touch is via our official channels below.
              </p>
            </section>

            <section className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-all">
                <h2 className="text-xl font-semibold text-white mb-3">GitHub</h2>
                <p className="text-slate-400 text-sm mb-4">Found a bug or want to request a feature?</p>
                <a 
                  href="https://github.com/nutshot2000/-Image-to-Base64-Converter" 
                  target="_blank" 
                  rel="noopener"
                  className="inline-flex items-center text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Open an Issue →
                </a>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all">
                <h2 className="text-xl font-semibold text-white mb-3">Social</h2>
                <p className="text-slate-400 text-sm mb-4">Follow for updates or say hello.</p>
                <div className="flex gap-4">
                  <a href="https://twitter.com/nutshot2000" className="text-slate-300 hover:text-white transition-colors">X / Twitter</a>
                  <a href="https://reddit.com/u/nutshot2000" className="text-slate-300 hover:text-white transition-colors">Reddit</a>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Support</h2>
              <p className="text-slate-400 text-sm mb-6">If you find the tool useful, consider supporting its development.</p>
              <a
                href="https://ko-fi.com/nutshot2000"
                target="_blank" rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold"
              >
                ☕ Buy me a coffee
              </a>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-white/5">
            <a href="/" className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-2">
              <span>←</span> Back to img64.dev
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
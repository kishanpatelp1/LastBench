import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EyeOff, Users, MessageSquare, BarChart3, Zap, Shield, Sparkles, ArrowRight, ExternalLink, CheckCircle2, GraduationCap, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/theme-store';

const features = [
  { icon: EyeOff, title: 'Anonymous by Default', desc: 'Share genuine campus confessions, exams feedback, or questions without fear. Toggle public handle whenever you choose.' },
  { icon: Users, title: 'Dedicated Campus Groups', desc: 'Join groups for your branch (CSE, ECE, Mech), hostel, sports, placement prep, and campus clubs.' },
  { icon: MessageSquare, title: 'Threaded Campus Discussions', desc: 'Nested comment threads with real upvotes/downvotes and instant notification alerts.' },
  { icon: BarChart3, title: 'Interactive Polls', desc: 'Create campus polls on any topic — from canteen food to exam dates — and see live voting percentages.' },
  { icon: Zap, title: 'Real-time Feed & Video', desc: 'Seamless infinite scrolling feed with native video streaming and link card embeds.' },
  { icon: Shield, title: 'Student-First Moderation', desc: 'Strict anti-harassment algorithms and student moderators keep discussions clean and safe.' },
];

const mockPosts = [
  {
    author: 'u/Anonymous',
    badge: '🕵️ Anonymous',
    time: '10m ago',
    group: 'g/confessions',
    title: 'Honestly, CS 301 midterms were way harder than expected 💀',
    content: 'Did anyone actually solve question 4 on Red-Black Tree rotations or did everyone just write pseudo-code and pray?',
    upvotes: 142,
    comments: 38,
    type: 'poll',
    pollOptions: [
      { text: 'Totally aced it 😎', pct: 14 },
      { text: 'Wrote pseudo-code and prayed 😭', pct: 68 },
      { text: 'Left it blank 💀', pct: 18 },
    ],
  },
  {
    author: 'u/tech_club_lead',
    badge: '🌐 Public',
    time: '1h ago',
    group: 'g/tech-club',
    title: '🚀 Annual Hackathon Registration is Live!',
    content: 'Check out the official problem statements and project guidelines for this year\'s 24-hour campus hackathon:',
    linkUrl: 'https://lastbench.app/hackathon-2026',
    upvotes: 89,
    comments: 19,
    type: 'link',
  },
];

export function LandingPage() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden relative transition-colors duration-200">
      {/* TAKE-U-FORWARD STYLE FIXED TRANSLUCENT FLOATING ISLAND NAVBAR */}
      <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl px-1">
        <nav className="bg-white/85 dark:bg-[#0d0b14]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/15 rounded-full shadow-lg shadow-black/5 dark:shadow-black/60 flex items-center justify-between h-13 sm:h-14 px-3.5 sm:px-5 transition-colors">
          <Link to="/" className="flex items-center gap-2 cursor-pointer shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary text-white flex items-center justify-center font-extrabold text-xs tracking-tight shadow-md shadow-primary/20">
              LB
            </div>
            <span className="font-extrabold text-foreground text-sm sm:text-base tracking-tight">LastBench</span>
          </Link>

          {/* Center Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">Home</Link>
            <Link to="/feed" className="hover:text-foreground transition-colors">Explore Feed</Link>
            <Link to="/groups" className="hover:text-foreground transition-colors">Campus Groups</Link>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-full hover:bg-secondary text-foreground transition-colors cursor-pointer border border-border/50"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/login" className="hidden sm:inline-block px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link
              to="/feed"
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold bg-primary text-white rounded-full hover:bg-primary/90 transition-all shadow-md shadow-primary/30 flex items-center gap-1 shrink-0"
            >
              <span>Explore</span>
              <ArrowRight size={12} className="hidden sm:inline" />
            </Link>
          </div>
        </nav>
      </div>

      {/* HERO SECTION WITH CLASSROOM BENCHES BACKGROUND */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4 overflow-hidden z-10">
        {/* Scoped Classroom Benches Wallpaper Background (Image 3) */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 mix-blend-overlay pointer-events-none z-0"
          style={{ backgroundImage: 'url(/classroom-hero.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-0 pointer-events-none" />

        {/* Glow background blob */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          {/* Left Text */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3.5 py-1.5 text-xs text-primary font-bold">
              <Sparkles size={14} />
              <span>The Next-Gen Campus Network for Students</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground leading-[1.1] tracking-tight">
              Where Your Campus <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Truly Connects.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Post anonymously or openly, join branch & club groups, vote on live polls, share media, and join real campus conversations — no fluff, no corporate energy.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/feed"
                className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/feed"
                className="w-full sm:w-auto px-8 py-3.5 border border-border text-foreground font-semibold rounded-full hover:bg-secondary transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span>Browse Campus Feed</span>
              </Link>
            </div>

            {/* Social Trust Metrics */}
            <div className="pt-6 flex items-center justify-center lg:justify-start gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>100% Student Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={16} className="text-primary" />
                <span>Privacy First & Anonymous</span>
              </div>
            </div>
          </div>

          {/* Right Interactive Mockup Card */}
          <div className="w-full lg:w-[480px] shrink-0">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl space-y-3 relative backdrop-blur-xl">
              {/* Card Header Bar */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-xs font-bold text-foreground/80 ml-2">LastBench Live Feed</span>
                </div>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">● Active Campus</span>
              </div>

              {/* Sample Live Posts */}
              {mockPosts.map((p, idx) => (
                <div key={idx} className="bg-secondary/40 border border-border/70 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-bold text-primary">{p.group}</span>
                    <span className="text-[10px] bg-background border border-border px-2 py-0.5 rounded font-semibold text-foreground">{p.badge}</span>
                  </div>

                  <h4 className="text-xs font-bold text-foreground leading-snug">{p.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{p.content}</p>

                  {p.type === 'poll' && (
                    <div className="space-y-1.5 pt-1">
                      {p.pollOptions?.map((opt, i) => (
                        <div key={i} className="relative rounded-md border border-border bg-background p-1.5 text-[11px] font-medium overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-primary/20" style={{ width: `${opt.pct}%` }} />
                          <div className="relative z-10 flex justify-between px-1 text-foreground">
                            <span>{opt.text}</span>
                            <span className="font-bold text-primary">{opt.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {p.type === 'link' && (
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-primary font-semibold">
                      <span className="truncate">{p.linkUrl}</span>
                      <ExternalLink size={12} className="shrink-0 ml-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground font-medium">
                    <span>🔥 {p.upvotes} upvotes</span>
                    <span>💬 {p.comments} comments</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-border bg-card/60 py-8 px-4 relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">100%</div>
            <div className="text-xs text-muted-foreground font-semibold mt-0.5">Student Privacy</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-primary">Instant</div>
            <div className="text-xs text-muted-foreground font-semibold mt-0.5">Campus Updates</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-purple-500">Unlimited</div>
            <div className="text-xs text-muted-foreground font-semibold mt-0.5">Branch & Club Groups</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-500">Real-time</div>
            <div className="text-xs text-muted-foreground font-semibold mt-0.5">Polls & Discussions</div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Designed Specifically for Campus Life
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything students need to stay informed, express thoughts, and build real community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors space-y-3 shadow-lg"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <feature.icon size={22} className="text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-base">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-normal">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-20 px-4 bg-card/60 border-t border-border text-center relative overflow-hidden z-10">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <GraduationCap size={28} />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            Ready to Take Your Campus Experience Higher?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Join your classmates on LastBench today. Share thoughts, vote on campus polls, and join your branch groups.
          </p>

          <div className="pt-2">
            <Link
              to="/feed"
              className="inline-flex px-8 py-3.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-sm shadow-xl shadow-primary/30 gap-2 items-center"
            >
              <span>Explore LastBench Feed</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-card border-t border-border py-8 px-4 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-white text-xs font-bold">
              LB
            </div>
            <span className="font-bold text-foreground">LastBench Campus Social</span>
          </div>

          <div>© 2026 LastBench. All rights reserved.</div>

          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

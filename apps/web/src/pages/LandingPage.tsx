import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Users, MessageSquare, BarChart3, Eye } from 'lucide-react';

const features = [
  { icon: Eye, title: 'Anonymous by Default', desc: 'Post freely without revealing your identity. Toggle public when you want.' },
  { icon: Users, title: 'Campus Communities', desc: 'Join communities across colleges — placements, memes, hostel life, and more.' },
  { icon: Zap, title: 'Realtime Everything', desc: 'Live comments, instant notifications, and typing indicators.' },
  { icon: MessageSquare, title: 'Threaded Discussions', desc: 'Nested replies, upvotes, and polls for meaningful conversations.' },
  { icon: BarChart3, title: 'Polls & Voting', desc: 'Create polls, upvote posts, and see trending content across campuses.' },
  { icon: Shield, title: 'AI-Powered Safety', desc: 'Automated toxicity filtering keeps the community respectful.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden text-foreground">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white font-black text-sm">L</span>
            </div>
            <span className="text-xl font-bold gradient-text">LastBench</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/feed" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-500/8 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-fuchsia-500/8 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-2xl animate-glow" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-6">
              <Zap size={14} /> The digital backbench of your campus
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              <span className="text-foreground">Welcome to LastBench.</span>
              <br />
              <span className="gradient-text">The campus social network.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed">
              The unfiltered social platform for sharing real campus gossip, posting unhinged polls, hosting heated hostel debates, and anonymous placement rants.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/feed">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg flex items-center gap-2 shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
              >
                Claim Your Seat <ArrowRight size={20} />
              </motion.div>
            </Link>
            <Link to="/login">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl bg-secondary border border-border text-foreground hover:bg-muted font-bold text-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Sign In
              </motion.div>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-8 md:gap-16 pt-8"
          >
            {[
              { value: '10K+', label: 'Backbenchers' },
              { value: '50+', label: 'Communities' },
              { value: '100K+', label: 'Confessions' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-black gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Everything your campus needs
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Built for real conversations, not performance theater.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950 border border-violet-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to join?</h2>
              <p className="text-violet-200/80 mb-8 max-w-md mx-auto">
                Create your anonymous account in seconds. No real name required.
              </p>
              <Link to="/feed">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex px-8 py-4 rounded-2xl bg-white text-violet-900 font-bold text-lg items-center gap-2 shadow-2xl hover:shadow-white/20 transition-shadow cursor-pointer"
                >
                  Get Started Free <ArrowRight size={20} />
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="text-sm font-semibold text-foreground">LastBench</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LastBench. Built for campuses.
          </p>
        </div>
      </footer>
    </div>
  );
}

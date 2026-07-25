import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Search, Users } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full space-y-6"
      >
        <div className="relative">
          <div className="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 drop-shadow-lg">
            404
          </div>
          <div className="text-4xl mt-2">🫥</div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            This bench is empty
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            The page or student discussion you are looking for doesn't exist, was archived, or you followed a broken link on campus.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-secondary text-foreground font-semibold text-sm flex items-center justify-center gap-2 border border-border hover:bg-muted transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            Go Back
          </motion.button>

          <Link
            to="/feed"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all cursor-pointer"
          >
            <Home size={16} />
            Back to Feed
          </Link>
        </div>

        <div className="pt-8 border-t border-border mt-8 w-full">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-4">
            Explore Other Campus Spaces
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <Link
              to="/groups"
              className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 flex items-center justify-center gap-2 text-sm font-medium transition-all text-foreground"
            >
              <Users size={16} className="text-violet-400" />
              All Groups
            </Link>
            <Link
              to="/search"
              className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 flex items-center justify-center gap-2 text-sm font-medium transition-all text-foreground"
            >
              <Search size={16} className="text-fuchsia-400" />
              Search Posts
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

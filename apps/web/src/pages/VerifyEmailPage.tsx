import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [isResending, setIsResending] = useState(false);
  
  // Use a ref to prevent double calling in strict mode
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    api.verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        toast.error(err instanceof Error ? err.message : 'Verification failed');
      });
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.resendVerification();
      toast.success('Verification email resent!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Verify Email</h2>
        <p className="text-muted-foreground mt-2">Confirm your student email address</p>
      </div>

      <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
        {status === 'verifying' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <p className="text-foreground font-medium">Verifying your email...</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-foreground font-medium">Email verified successfully!</p>
            
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/feed')}
              className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all cursor-pointer"
            >
              Continue to LastBench <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            <XCircle className="w-16 h-16 text-red-500" />
            <p className="text-foreground font-medium">Verification failed or token expired</p>
            
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleResend}
              disabled={isResending}
              className="w-full mt-4 py-3.5 rounded-xl bg-secondary border border-border text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-all cursor-pointer disabled:opacity-50"
            >
              {isResending ? (
                <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              ) : (
                <>Resend verification email <RefreshCw size={18} /></>
              )}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

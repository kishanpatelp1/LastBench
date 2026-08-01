import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Flag, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

interface ReportModalProps {
  isOpen?: boolean;
  onClose: () => void;
  targetId?: string;
  targetType?: 'POST' | 'COMMENT';
  entityId?: string;
  entityType?: 'POST' | 'COMMENT';
}

const reasons = [
  { value: 'spam', label: 'Spam or malicious links', desc: 'Repetitive advertising, scam links, or bots' },
  { value: 'harassment', label: 'Harassment or bullying', desc: 'Targeted insults, intimidation, or harassment' },
  { value: 'hate_speech', label: 'Hate speech', desc: 'Discrimination or promotion of violence against identities' },
  { value: 'misinformation', label: 'Misinformation or rumor', desc: 'False academic, campus, or personal claims' },
  { value: 'nsfw', label: 'NSFW / Inappropriate content', desc: 'Sexually explicit or inappropriate content for campus' },
  { value: 'doxxing', label: 'Doxxing / Privacy violation', desc: 'Sharing private personal info, phone numbers, or addresses' },
  { value: 'violence', label: 'Violence or threatening harm', desc: 'Threats of physical harm or violence' },
  { value: 'other', label: 'Other issue', desc: 'Anything else violating campus decorum or guidelines' },
] as const;

export function ReportModal({ isOpen = true, onClose, targetId, targetType, entityId, entityType }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<typeof reasons[number]['value']>('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalId = entityId ?? targetId;
  const finalType = entityType ?? targetType ?? 'POST';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        reason: (selectedReason || 'other').toLowerCase(),
      };

      if (finalType === 'COMMENT') {
        payload.commentId = finalId;
      } else {
        payload.postId = finalId;
      }

      const trimmedDetails = details.trim();
      if (trimmedDetails.length > 0) {
        payload.details = trimmedDetails;
      }

      await api.createReport(payload);

      toast.success('Report submitted. Our moderators will review it shortly.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && finalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg p-6 overflow-hidden border shadow-xl bg-card rounded-2xl border-border max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 text-red-500">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Flag size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Report {targetType === 'POST' ? 'Post' : 'Comment'}</h2>
                <p className="text-xs text-muted-foreground">Help campus moderators triage this content</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 transition-colors rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Reason</label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {reasons.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setSelectedReason(r.value)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedReason === r.value
                        ? 'border-red-500/60 bg-red-500/10 text-foreground shadow-sm'
                        : 'border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="details" className="text-sm font-medium flex items-center justify-between text-foreground">
                <span>Additional Details (Optional)</span>
                <span className="text-xs text-muted-foreground">{details.length}/1000</span>
              </label>
              <textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Provide any additional context for campus moderators..."
                className="w-full p-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 text-sm resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-border bg-secondary font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

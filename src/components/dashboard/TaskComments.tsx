"use client";

import { useEffect, useState } from "react";
import { Comment } from "@/types";
import { fetchComments, postComment, deleteComment } from "@/lib/api/comments";
import { useAuth } from "@/lib/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TaskComments({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchComments(taskId)
      .then((data) => { if (!cancelled) setComments(data); })
      .catch(() => { if (!cancelled) setError("Couldn't load comments"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [taskId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const comment = await postComment(taskId, draft.trim());
      setComments((prev) => [...prev, comment]);
      setDraft("");
    } catch {
      setError("Couldn't post comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const prev = comments;
    setComments((c) => c.filter((c) => c.id !== commentId));
    try {
      await deleteComment(taskId, commentId);
    } catch {
      setComments(prev);
      setError("Couldn't delete comment");
    }
  }

  return (
    <div className="border-t border-surface-border pt-4 mt-4">
      <h3 className="text-xs font-medium text-ink-muted mb-2">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      <div className="max-h-48 overflow-y-auto space-y-3 mb-3 pr-1">
        {loading && <p className="text-xs text-ink-faint">Loading…</p>}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-ink-faint">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar name={c.authorName} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink">{c.authorName}</span>
                <span className="text-xs text-ink-faint">{formatTimestamp(c.createdAt)}</span>
                {user?.id === c.authorId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    aria-label="Delete comment"
                    className="ml-auto text-ink-faint hover:text-status-danger cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-ink whitespace-pre-wrap break-words">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-status-danger mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-md border border-surface-border bg-surface px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={submitting || !draft.trim()}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white cursor-pointer",
            (submitting || !draft.trim()) && "opacity-60 cursor-not-allowed"
          )}
        >
          Post
        </button>
      </form>
    </div>
  );
}
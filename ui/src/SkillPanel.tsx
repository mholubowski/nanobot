import { useEffect, useState } from "react";
import { fetchSkillContent } from "./adapter";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Loader2 } from "lucide-react";

type Props = {
  skillName: string;
  onClose: () => void;
};

export function SkillPanel({ skillName, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContent(null);
    fetchSkillContent(skillName).then((result) => {
      if (cancelled) return;
      setContent(result?.content ?? "Skill not found.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [skillName]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-zinc-200 truncate">
            {skillName}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 shrink-0">
            SKILL
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          title="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="prose prose-sm prose-invert prose-zinc max-w-none text-sm text-zinc-300">
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type MentionUser = { id: string; name: string };

export default function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/mentionable")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUsers(data.users || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute who's actually mentioned any time the text or user list changes -
  // this way it stays correct even if someone edits or deletes a mention by hand.
  useEffect(() => {
    if (!onMentionsChange) return;
    if (users.length === 0) return;
    const ids = users.filter((u) => value.includes(`@${u.name}`)).map((u) => u.id);
    onMentionsChange(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, users]);

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query)).slice(0, 6)
    : users.slice(0, 6);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(text);
    detectMention(text, cursor);
  }

  function detectMention(text: string, cursor: number) {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9._' -]*)$/);
    if (match) {
      setQuery(match[1].toLowerCase());
      setMentionStart(cursor - match[1].length - 1);
      setShowDropdown(true);
      setHighlighted(0);
    } else {
      setShowDropdown(false);
      setMentionStart(null);
    }
  }

  function selectUser(u: MentionUser) {
    if (mentionStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const next = `${before}@${u.name} ${after}`;
    onChange(next);
    setShowDropdown(false);
    setMentionStart(null);

    requestAnimationFrame(() => {
      const pos = before.length + u.name.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectUser(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div className="relative">
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-20 bottom-full mb-1 left-0 w-60 max-h-44 overflow-y-auto card shadow-lg py-1">
          {filtered.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectUser(u)}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full text-left px-3 py-1.5 text-sm ${
                i === highlighted ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              @{u.name}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
      />
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Type @ to tag someone - they'll get a notification.</p>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = "http://localhost:8000";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fmtSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function fmtTime(d) {
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function fmtTimestamp(d) {
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fileExt(name) {
  return (name || "").split(".").pop()?.toUpperCase() ?? "FILE";
}

function extColor(ext) {
  const map = {
    PDF: "bg-red-500/20 text-red-400",
    DOCX: "bg-blue-500/20 text-blue-400",
    DOC: "bg-blue-500/20 text-blue-400",
    XLSX: "bg-green-500/20 text-green-400",
    XLS: "bg-green-500/20 text-green-400",
    PNG: "bg-purple-500/20 text-purple-400",
    JPG: "bg-purple-500/20 text-purple-400",
    JPEG: "bg-purple-500/20 text-purple-400",
    TXT: "bg-gray-500/20 text-gray-400",
    CSV: "bg-emerald-500/20 text-emerald-400",
  };
  return map[ext] ?? "bg-slate-500/20 text-slate-400";
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs text-[#4a5060]">
      {time.toLocaleTimeString("en-US", { hour12: false })}
    </span>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function AgentMarkdown({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 text-[#c8cdd8] text-sm leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="text-[#f0f2f5] font-semibold">{children}</strong>,
        em: ({ children }) => <em className="text-[#8b92a0] italic">{children}</em>,
        h1: ({ children }) => <h1 className="text-lg font-bold text-[#f0f2f5] mb-3 mt-4 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold text-[#f0f2f5] mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-[#e2e8f0] mb-2 mt-3 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1 list-disc list-outside text-[#c8cdd8] text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1 list-decimal list-outside text-[#c8cdd8] text-sm">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-teal-500 pl-4 my-3 text-[#8b92a0] italic text-sm">{children}</blockquote>
        ),
        code: ({ inline, className, children, ...props }) => {
          if (inline) {
            return (
              <code
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                className="bg-[#0c0d12] text-teal-300 px-1.5 py-0.5 rounded text-xs"
                {...props}
              >
                {children}
              </code>
            );
          }
          const lang = className?.replace("language-", "") ?? "";
          return (
            <div className="relative my-3 rounded-xl overflow-hidden border border-white/5">
              {lang && (
                <div className="flex items-center justify-between px-4 py-2 bg-[#0c0d12] border-b border-white/5">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs text-[#4a5060]">{lang}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children))}
                    className="text-xs text-[#4a5060] hover:text-teal-400 transition-colors"
                  >
                    copy
                  </button>
                </div>
              )}
              <pre className="bg-[#0c0d12] p-4 overflow-x-auto">
                <code
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs text-[#c8cdd8] leading-relaxed"
                  {...props}
                >
                  {children}
                </code>
              </pre>
            </div>
          );
        },
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-teal-500/10 text-teal-400">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
        th: ({ children }) => <th className="px-4 py-2 text-left text-xs font-semibold">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 text-[#c8cdd8] text-xs">{children}</td>,
        tr: ({ children }) => <tr className="hover:bg-white/[0.02]">{children}</tr>,
        hr: () => <hr className="my-4 border-white/5" />,
        a: ({ href, children }) => (
          <a href={href} className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors">{children}</a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Thinking stepper ─────────────────────────────────────────────────────────

const STEPS = ["Routing", "Thinking", "Tool Call", "Result", "Answer"];

function ThinkingStepper({ steps }) {
  return (
    <div className="shimmer rounded-2xl border border-white/5 p-5 max-w-[75%] msg-enter">
      <div className="flex items-center gap-1 mb-4">
        <span className="text-xs text-teal-400 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          ◆ SOVEREIGN AGENT
        </span>
        <span className="text-xs text-[#4a5060] ml-1">processing…</span>
      </div>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                  step.status === "done"
                    ? "bg-teal-500"
                    : step.status === "active"
                    ? "bg-transparent border-2 border-teal-400 pulse-ring"
                    : "bg-transparent border border-[#4a5060]"
                }`}
              >
                {step.status === "done" && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${
                step.status === "active" ? "text-teal-400" : step.status === "done" ? "text-[#8b92a0]" : "text-[#4a5060]"
              }`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mb-3.5 ${
                steps[i + 1].status !== "pending" || step.status === "done" ? "bg-teal-500/40" : "bg-[#4a5060]/30"
              }`} />
            )}
          </div>
        ))}
      </div>
      {steps.find(s => s.status === "active")?.detail && (
        <p className="mt-3 text-[11px] text-[#4a5060] thinking-pulse" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Executing: {steps.find(s => s.status === "active")?.detail}
        </p>
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1 msg-enter">
        <span className="text-[11px] text-[#4a5060] mr-1">You</span>
        <div
          className="relative max-w-[60%] rounded-2xl px-5 py-4 text-sm text-[#e2e8f0]"
          style={{
            background: "#161820",
            border: "1px solid transparent",
            backgroundClip: "padding-box",
            boxShadow: "0 0 0 1px rgba(20,184,166,0.25), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-[#4a5060] mr-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {fmtTime(msg.ts)}
        </span>
      </div>
    );
  }

  if (msg.thinking && msg.isStreaming) {
    return <ThinkingStepper steps={msg.thinking} />;
  }

  return (
    <div className="flex flex-col items-start gap-1 msg-enter">
      <span className="text-[11px] text-teal-400 font-medium ml-1">◆ Sovereign Agent</span>
      <div
        className="relative max-w-[75%] rounded-2xl px-5 py-4"
        style={{
          background: "#111318",
          borderLeft: "2px solid transparent",
          backgroundImage: "linear-gradient(#111318, #111318), linear-gradient(to bottom, #14b8a6, #10b981)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        {msg.isStreaming && !msg.content ? (
          <div className="flex gap-1 items-center h-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-500/60 thinking-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        ) : (
          <AgentMarkdown content={msg.content} />
        )}
      </div>
      <span className="text-[10px] text-[#4a5060] ml-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {fmtTime(msg.ts)}
      </span>
    </div>
  );
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ onFileSelect, refreshTrigger }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/documents`)
      .then(r => r.json())
      .then(d => { setDocs(d.documents ?? []); setLoading(false); })
      .catch(() => { setDocs([]); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  if (!docs.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 px-4">
        <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(74,80,96,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm text-[#4a5060] font-medium">Drop files to analyze</p>
          <p className="text-xs text-[#4a5060]/60 mt-1">Supports PDF, DOCX, images</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map(doc => {
        const ext = fileExt(doc.name);
        return (
          <button
            key={doc.name}
            onClick={() => onFileSelect(doc.name)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#161820] hover:bg-[#1c1e28] border border-white/[0.04] hover:border-teal-500/20 transition-all duration-200 group"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${extColor(ext)}`}>
              {ext}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs text-[#e2e8f0] truncate">{doc.name}</p>
              <p className="text-[10px] text-[#4a5060] mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtSize(doc.size)}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(74,80,96,1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-teal-400 transition-colors flex-shrink-0">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

const LOG_DOT = {
  routing: "bg-teal-500",
  tool_call: "bg-yellow-500",
  tool_result: "bg-green-500",
  answer: "bg-blue-500",
  error: "bg-red-500",
  info: "bg-[#4a5060]",
};

function ActivityTab({ log }) {
  if (!log.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-48">
        <div className="w-2 h-2 rounded-full bg-[#4a5060] thinking-pulse" />
        <p className="text-xs text-[#4a5060]">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {log.map(entry => (
        <div key={entry.id} className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${LOG_DOT[entry.type] || "bg-[#4a5060]"}`} />
          <div className="flex-1 min-w-0">
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[10px] text-[#4a5060] mr-2">
              {fmtTimestamp(entry.ts)}
            </span>
            <span className="text-xs text-[#8b92a0] break-all">{entry.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Outputs tab ──────────────────────────────────────────────────────────────

function OutputsTab({ refreshTrigger }) {
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/outputs`)
      .then(r => r.json())
      .then(d => { setOutputs(d.outputs ?? []); setLoading(false); })
      .catch(() => { setOutputs([]); setLoading(false); });
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  if (!outputs.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-48 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(74,80,96,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p className="text-xs text-[#4a5060]">Agent will create deliverables here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {outputs.map(out => {
        const ext = fileExt(out.name);
        return (
          <div key={out.name} className="flex items-center gap-3 p-3 rounded-xl bg-[#161820] border border-white/[0.04]">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${extColor(ext)}`}>
              {ext}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#e2e8f0] truncate">{out.name}</p>
              <p className="text-[10px] text-[#4a5060] mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtSize(out.size)}
              </p>
            </div>
            <a
              href={`${API}/api/outputs/${encodeURIComponent(out.name)}`}
              download
              className="w-7 h-7 rounded-full bg-teal-500/10 hover:bg-teal-500/20 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const NAV_ICONS = [
  {
    id: "chat", label: "Chat",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    id: "docs", label: "Documents",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  {
    id: "settings", label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    disabled: true,
  },
];

const RIGHT_TABS = ["Documents", "Activity", "Outputs", "Audit"];

function buildThinkingSteps() {
  return STEPS.map((label, i) => ({
    id: String(i),
    label,
    status: "pending",
  }));
}

function stepIndexFor(type) {
  const map = { routing: 0, thinking: 1, tool_call: 2, tool_result: 3, answer: 4 };
  return map[type] ?? -1;
}

// ─── Audit tab ────────────────────────────────────────────────────────────────

function AuditTab({ refreshTrigger }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/audit`)
      .then(r => r.json())
      .then(d => { setEntries(d.audit_log ?? []); setLoading(false); })
      .catch(() => { setEntries([]); setLoading(false); });
  }, [refreshTrigger]);

  const actionColor = {
    chat_request: "text-teal-400",
    file_upload: "text-blue-400",
    file_download: "text-emerald-400",
    tool_execution: "text-yellow-400",
  };

  const actionIcon = {
    chat_request: "💬",
    file_upload: "📤",
    file_download: "📥",
    tool_execution: "⚙️",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-48">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(74,80,96,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <p className="text-xs text-[#4a5060]">No audit entries yet</p>
        <p className="text-[10px] text-[#4a5060]/60">All actions will be logged here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.slice().reverse().map((entry, i) => {
        const ts = entry.timestamp ? new Date(entry.timestamp) : new Date();
        return (
          <div key={i} className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
            <span className="text-sm flex-shrink-0 mt-0.5">{actionIcon[entry.action] || "📋"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium ${actionColor[entry.action] || 'text-[#8b92a0]'}`}>
                  {(entry.action || "").replace("_", " ").toUpperCase()}
                </span>
                <span className="text-[10px] text-[#4a5060]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtTimestamp(ts)}
                </span>
              </div>
              <p className="text-[11px] text-[#8b92a0] mt-0.5 truncate">
                {entry.details?.prompt?.slice(0, 80) || entry.details?.filename || JSON.stringify(entry.details || {}).slice(0, 80)}
              </p>
              <span className="text-[10px] text-[#4a5060]/60">by {entry.user || "engineer"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [navActive, setNavActive] = useState("chat");
  const [rightTab, setRightTab] = useState("Documents");
  const [rightOpen, setRightOpen] = useState(true);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("sovereign_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(m => ({ ...m, ts: new Date(m.ts) }));
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [model, setModel] = useState("qwen3.5:9b");
  const [toolCount, setToolCount] = useState(0);
  const [attached, setAttached] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tokenStats, setTokenStats] = useState({ total_tokens: 0, total_requests: 0, estimated_cloud_cost_usd: 0 });
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      const toSave = messages.filter(m => !m.isStreaming).map(m => ({
        id: m.id, role: m.role, content: m.content, ts: m.ts.toISOString()
      }));
      localStorage.setItem("sovereign_messages", JSON.stringify(toSave));
    } catch {}
  }, [messages]);

  // fetch health + stats
  useEffect(() => {
    const fetchHealth = () => {
      fetch(`${API}/health`)
        .then(r => r.json())
        .then(d => { if (d.model) setModel(d.model); setToolCount((d.tools || []).length); })
        .catch(() => {});
      fetch(`${API}/api/stats`)
        .then(r => r.json())
        .then(d => setTokenStats(d))
        .catch(() => {});
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // textarea auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const addLog = (type, text) => {
    setLog(prev => [...prev, { id: uid(), ts: new Date(), type, text }]);
  };

  const handleFileSelect = (name) => {
    setInput(prev => prev + (prev ? " " : "") + `[Attached: ${name}]`);
    setNavActive("chat");
  };

  const handleUpload = async (file) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch(`${API}/api/upload`, { method: "POST", body: form });
      const d = await r.json();
      addLog("info", `Uploaded: ${d.filename ?? file.name}`);
      setRefreshTrigger(prev => prev + 1);
    } catch {
      addLog("error", `Upload failed: ${file.name}`);
    }
  };

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;

    setInput("");
    setBusy(true);

    const userMsg = { id: uid(), role: "user", content: prompt, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);

    if (attached) {
      await handleUpload(attached);
      setAttached(null);
    }

    const thinkingSteps = buildThinkingSteps();
    const agentMsgId = uid();
    const agentMsg = {
      id: agentMsgId,
      role: "agent",
      content: "",
      ts: new Date(),
      thinking: thinkingSteps,
      isStreaming: true,
    };
    setMessages(prev => [...prev, agentMsg]);

    try {
      // Build conversation history for multi-turn memory
      const history = messages
        .filter(m => !m.isStreaming && m.content)
        .map(m => ({ role: m.role === "agent" ? "assistant" : "user", content: m.content }))
        .slice(-10); // Last 10 messages for context

      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, history }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalContent = "";
      let currentSteps = [...thinkingSteps];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          let event;
          try { event = JSON.parse(payload); } catch { continue; }

          const { type } = event;

          if (type === "routing") {
            addLog("routing", `Routing → ${event.task_type ?? "general"}`);
            currentSteps = currentSteps.map((s, i) => ({
              ...s,
              status: i === 0 ? "done" : i === 1 ? "active" : "pending",
            }));
          } else if (type === "tool_call") {
            addLog("tool_call", `Tool: ${event.tool}`);
            currentSteps = currentSteps.map((s, i) => ({
              ...s,
              status: i < 2 ? "done" : i === 2 ? "active" : "pending",
              detail: i === 2 ? event.tool : s.detail,
            }));
          } else if (type === "tool_result") {
            addLog("tool_result", `Result from ${event.tool}`);
            currentSteps = currentSteps.map((s, i) => ({
              ...s,
              status: i < 3 ? "done" : i === 3 ? "active" : "pending",
            }));
          } else if (type === "answer") {
            finalContent += event.content ?? "";
            currentSteps = currentSteps.map((s, i) => ({
              ...s,
              status: i < 4 ? "done" : "active",
            }));
            addLog("answer", "Streaming answer…");
          } else if (type === "token_usage") {
            const tokens = event.total_tokens || 0;
            const cost = ((tokens / 1_000_000) * 5).toFixed(4);
            addLog("info", `Tokens: ${tokens} | Cloud cost saved: $${cost}`);
            // Refresh stats from server
            fetch(`${API}/api/stats`).then(r => r.json()).then(d => setTokenStats(d)).catch(() => {});
          } else if (type === "error") {
            addLog("error", event.content ?? "Unknown error");
            finalContent = `**Error:** ${event.content}`;
          }

          const steps = [...currentSteps];
          setMessages(prev =>
            prev.map(m =>
              m.id === agentMsgId
                ? { ...m, thinking: steps, content: finalContent }
                : m
            )
          );
        }
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === agentMsgId
            ? { ...m, content: finalContent || "Done.", thinking: undefined, isStreaming: false }
            : m
        )
      );
    } catch {
      addLog("error", "Connection failed");
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMsgId
            ? { ...m, content: "**Error:** Could not reach the Sovereign Agent. Is the server running?", thinking: undefined, isStreaming: false }
            : m
        )
      );
    }

    setBusy(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'Inter', sans-serif", background: "#06070a", color: "#f0f2f5" }}
    >
      {/* ── TOP BAR ── */}
      <header
        className="flex items-center gap-4 px-4 flex-shrink-0 border-b"
        style={{ height: 56, borderColor: "rgba(255,255,255,0.05)", background: "#0a0c10" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0" style={{ width: 60 }}>
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0ea5e9, #14b8a6)" }}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-semibold text-sm tracking-[0.18em] text-[#f0f2f5]">SOVEREIGN</span>
          <div className="w-px h-4 bg-white/10" />
          <span className="font-light text-sm text-[#4a5060]">AI WORKBENCH</span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-auto">
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a5060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              readOnly
              placeholder="Search conversations, documents..."
              className="flex-1 bg-transparent text-sm text-[#4a5060] placeholder-[#4a5060] outline-none cursor-pointer"
            />
            <span
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{ fontFamily: "'JetBrains Mono', monospace", borderColor: "rgba(255,255,255,0.08)", color: "#4a5060" }}
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* Right status strip */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Air-gapped badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "linear-gradient(90deg, rgba(14,165,233,0.15), rgba(20,184,166,0.15))", border: "1px solid rgba(20,184,166,0.2)", color: "#14b8a6" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            AIR-GAPPED
          </div>

          <div className="w-px h-4 bg-white/5" />

          {/* Model */}
          <span
            className="px-2.5 py-0.5 rounded-full text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/20"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {model}
          </span>

          <div className="w-px h-4 bg-white/5" />

          {/* Token Counter */}
          {tokenStats.total_tokens > 0 && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {tokenStats.total_tokens.toLocaleString()} tok
                </span>
                <span className="text-[10px] text-emerald-400/60">·</span>
                <span className="text-[11px] text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ₹{(tokenStats.estimated_cloud_cost_usd * 85).toFixed(0)} saved
                </span>
              </div>
              <div className="w-px h-4 bg-white/5" />
            </>
          )}

          {/* Network */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[11px] text-[#4a5060]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>0 External</span>
          </div>

          <div className="w-px h-4 bg-white/5" />
          <LiveClock />
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── LEFT SIDEBAR (60px) ── */}
        <aside
          className="flex flex-col items-center py-4 gap-2 flex-shrink-0"
          style={{ width: 60, background: "#0a0c10", borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          {NAV_ICONS.map(nav => (
            <button
              key={nav.id}
              onClick={() => !nav.disabled && setNavActive(nav.id)}
              disabled={nav.disabled}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                nav.disabled
                  ? "text-[#2a2f3a] cursor-not-allowed"
                  : navActive === nav.id
                  ? "text-teal-300"
                  : "text-[#4a5060] hover:text-[#8b92a0]"
              }`}
              style={
                navActive === nav.id && !nav.disabled
                  ? {
                      background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(20,184,166,0.12))",
                      boxShadow: "0 0 20px rgba(20,184,166,0.1)",
                    }
                  : {}
              }
              title={nav.label}
            >
              {nav.icon}
            </button>
          ))}

          {/* Avatar */}
          <div className="mt-auto relative">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-[#0a0c10]"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #14b8a6)" }}
            >
              JE
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0a0c10]" />
          </div>
        </aside>

        {/* ── MAIN PANEL ── */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0a0c10" }}>
          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-8 select-none px-4">
                {/* Hero Section */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20" style={{ background: "linear-gradient(135deg, #0ea5e9, #14b8a6, #10b981)" }} />
                  <div
                    className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(20,184,166,0.2))", border: "1px solid rgba(20,184,166,0.3)", boxShadow: "0 0 40px rgba(20,184,166,0.15)" }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#hero-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <defs><linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#14b8a6"/></linearGradient></defs>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-xl font-semibold text-[#f0f2f5] tracking-tight">Sovereign AI Workbench</h2>
                  <p className="text-[#4a5060] text-sm mt-2 max-w-md">
                    Air-gapped, on-premise AI assistant for confidential industrial work. 
                    All data stays on this machine. Zero external connections.
                  </p>
                </div>

                {/* Capability Cards */}
                <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                  {[
                    { icon: "📄", title: "Analyze Documents", desc: "Scan PDFs, P&IDs, inspection reports with vision AI", action: "Analyze the uploaded document and extract key findings" },
                    { icon: "📝", title: "Draft Reports", desc: "Generate approval notes, board presentations, memos", action: "Draft an approval note for the annual maintenance shutdown" },
                    { icon: "🔢", title: "Engineering Calcs", desc: "Pressure drop, flow rate, heat transfer calculations", action: "Calculate the pressure drop across a 6-inch pipe at 500 GPM" },
                    { icon: "🔍", title: "Knowledge Search", desc: "Search SOPs, manuals, past reports in your knowledge base", action: "Search the knowledge base for safety valve inspection procedures" },
                  ].map(cap => (
                    <button
                      key={cap.title}
                      onClick={() => setInput(cap.action)}
                      className="group flex flex-col gap-2 p-4 rounded-xl text-left transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.25)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(20,184,166,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)"; }}
                    >
                      <span className="text-xl">{cap.icon}</span>
                      <span className="text-sm font-medium text-[#e2e8f0] group-hover:text-teal-300 transition-colors">{cap.title}</span>
                      <span className="text-[11px] text-[#4a5060] leading-relaxed">{cap.desc}</span>
                    </button>
                  ))}
                </div>

                {/* System Status Bar */}
                <div className="flex items-center gap-4 px-6 py-3 rounded-xl max-w-lg w-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-[#4a5060] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>System</span>
                  </div>
                  <div className="flex items-center gap-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span className="text-[10px] text-violet-400">GPU: RTX 4050</span>
                    <span className="text-[10px] text-[#4a5060]">|</span>
                    <span className="text-[10px] text-teal-400">{model}</span>
                    <span className="text-[10px] text-[#4a5060]">|</span>
                    <span className="text-[10px] text-red-400">🔒 Isolated</span>
                    <span className="text-[10px] text-[#4a5060]">|</span>
                    <span className="text-[10px] text-emerald-400">{toolCount} tools</span>
                  </div>
                </div>

                {/* Quick suggestions */}
                <div className="flex gap-2 flex-wrap justify-center max-w-lg">
                  {["Generate an Excel report", "Create a Word document", "Analyze a scanned drawing"].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="px-3.5 py-2 rounded-lg text-xs text-[#8b92a0] hover:text-teal-300 hover:border-teal-500/30 transition-all duration-200"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {s} →
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* ── INPUT COMPOSER ── */}
          <div className="px-8 pb-6 flex-shrink-0">
            {attached && (
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span>📎</span>
                  <span className="text-[#8b92a0] max-w-[200px] truncate">{attached.name}</span>
                  <button onClick={() => setAttached(null)} className="text-[#4a5060] hover:text-red-400 transition-colors ml-1">✕</button>
                </div>
              </div>
            )}
            <div
              className="flex items-end gap-3 p-2 rounded-2xl max-w-4xl mx-auto"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
            >
              {/* Attach */}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[#4a5060] hover:text-white hover:bg-teal-500/20 transition-all duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx"
                onChange={e => { const f = e.target.files?.[0]; if (f) setAttached(f); e.target.value = ""; }}
              />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Sovereign Agent…"
                disabled={busy}
                className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#4a5060] outline-none resize-none leading-relaxed py-2"
                style={{ fontFamily: "'Inter', sans-serif", maxHeight: 160 }}
              />

              {/* Send */}
              <button
                onClick={send}
                disabled={!input.trim() || busy}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-30"
                style={
                  input.trim() && !busy
                    ? {
                        background: "linear-gradient(135deg, #0ea5e9, #14b8a6)",
                        boxShadow: "0 0 16px rgba(20,184,166,0.35)",
                      }
                    : { background: "#1c1e28" }
                }
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        {rightOpen && (
          <aside
            className="flex flex-col flex-shrink-0"
            style={{ width: 320, background: "#0d0f14", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
          >
            {/* Tab bar */}
            <div
              className="flex items-center gap-1 px-4 flex-shrink-0 border-b"
              style={{ height: 56, borderColor: "rgba(255,255,255,0.05)" }}
            >
              {RIGHT_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`relative px-3 py-1.5 text-xs font-medium transition-colors ${
                    rightTab === tab ? "text-teal-400" : "text-[#4a5060] hover:text-[#8b92a0]"
                  }`}
                >
                  {tab}
                  {tab === "Activity" && log.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-teal-500/20 text-teal-400">
                      {log.length}
                    </span>
                  )}
                  {rightTab === tab && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: "linear-gradient(90deg, #0ea5e9, #14b8a6)" }}
                    />
                  )}
                </button>
              ))}
              <button
                onClick={() => setRightOpen(false)}
                className="ml-auto text-[#4a5060] hover:text-[#8b92a0] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {rightTab === "Documents" && <DocumentsTab onFileSelect={handleFileSelect} refreshTrigger={refreshTrigger} />}
              {rightTab === "Activity" && <ActivityTab log={log} />}
              {rightTab === "Outputs" && <OutputsTab refreshTrigger={refreshTrigger} />}
              {rightTab === "Audit" && <AuditTab refreshTrigger={refreshTrigger} />}
            </div>
          </aside>
        )}

        {/* Panel toggle when closed */}
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center text-[#4a5060] hover:text-teal-400 transition-colors"
            style={{ background: "#0d0f14", borderRadius: "6px 0 0 6px", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
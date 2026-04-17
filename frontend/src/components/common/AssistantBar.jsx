import { useState, useRef } from "react";
import { Sparkles, Send, X } from "lucide-react";
import "../../styles/AssistantBar.css";

const HINTS = [
  'add Harry Potter to cart',
  'show Dune',
  'go to wishlist',
  'face registration',
  'edit profile',
];

export default function AssistantBar({ onCommand }) {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const inputRef = useRef(null);

  const handleOpen = () => {
    setOpen(true);
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleClose = () => {
    setOpen(false);
    setInput("");
    setResult(null);
  };

  const handleSubmit = async () => {
    const val = input.trim();
    if (!val || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await onCommand(val);
      setResult(res);
      setInput("");
    } catch {
      setResult({ ok: false, msg: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button className="assistant-trigger" onClick={handleOpen}>
        <Sparkles size={13} />
        Ask anything...
      </button>
    );
  }

  return (
    <div className="assistant">
      <div className="assistant__header">
        <Sparkles size={13} />
        <span>Assistant</span>
        <button className="assistant__close" onClick={handleClose} aria-label="Close assistant">
          <X size={13} />
        </button>
      </div>

      <div className="assistant__input-row">
        <input
          ref={inputRef}
          className="assistant__input"
          placeholder="Type a command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
          aria-label="Assistant command input"
        />
        <button
          className="assistant__send"
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          aria-label="Send command"
        >
          {loading
            ? <span className="assistant__spinner" />
            : <Send size={13} />}
        </button>
      </div>

      {result && (
        <div className={`assistant__result${result.ok ? "" : " assistant__result--error"}`}>
          {result.msg}
        </div>
      )}

      {!result && (
        <div className="assistant__hints">
          <div className="assistant__hints-label">Try saying</div>
          {HINTS.map((h) => (
            <button
              key={h}
              className="assistant__hint"
              onClick={() => { setInput(h); inputRef.current?.focus(); }}
            >
              "{h}"
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

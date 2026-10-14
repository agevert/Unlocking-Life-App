"use client";

import { useEffect, useRef, useState } from "react";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechErrorEvent = { error: string };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onresult: ((event: SpeechEvent) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => Recognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

function editableTarget(el: Element | null): HTMLInputElement | HTMLTextAreaElement | null {
  if (el?.closest("[hidden], [inert]")) return null;
  if (el instanceof HTMLTextAreaElement && !el.disabled && !el.readOnly) return el;
  if (el instanceof HTMLInputElement && !el.disabled && !el.readOnly) {
    const ok = ["text", "search", "email", "url", "tel"].includes(el.type || "text");
    return ok ? el : null;
  }
  return null;
}

function insertTranscript(el: HTMLInputElement | HTMLTextAreaElement, spoken: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  const needsSpace = before.length > 0 && !/\s$/.test(before);
  const text = `${before}${needsSpace ? " " : ""}${spoken.trim()}${after}`;
  const setter = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(el, text);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const cursor = (before + (needsSpace ? " " : "") + spoken.trim()).length;
  requestAnimationFrame(() => el.setSelectionRange(cursor, cursor));
}

const languages = [
  { value: "auto", label: "Auto" },
  { value: "en-US", label: "EN" },
  { value: "de-DE", label: "DE" },
  { value: "es-CL", label: "ES" },
];

export function VoiceDock() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("auto");
  const target = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    const stored = window.localStorage.getItem("unlocking-life-voice-lang");
    if (stored && languages.some((x) => x.value === stored)) setLanguage(stored);

    const focus = (event: FocusEvent) => {
      const el = editableTarget(event.target instanceof Element ? event.target : null);
      if (el) {
        target.current = el;
        setHasTarget(true);
      }
    };
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("focusin", focus);
      const rec = recognition.current;
      recognition.current = null;
      if (rec) {
        rec.onstart = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!hasTarget) return;
    // Sending an answer or closing the interview can disable/remove the focused field.
    const observer = new MutationObserver(() => {
      const el = target.current;
      if (el?.isConnected && editableTarget(el)) return;
      target.current = null;
      setHasTarget(false);
      recognition.current?.stop();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "readonly", "hidden", "inert"] });
    return () => observer.disconnect();
  }, [hasTarget]);

  const stop = () => recognition.current?.stop();

  const start = () => {
    if (!supported || !target.current) return;
    if (!target.current.isConnected || !editableTarget(target.current)) {
      target.current = null;
      setHasTarget(false);
      return;
    }
    setError(null);
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recognition.current = rec;
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = language === "auto" ? navigator.language || "en-US" : language;
    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      if (recognition.current === rec) recognition.current = null;
    };
    rec.onerror = (event) => {
      setListening(false);
      setError(event.error === "not-allowed" ? "Microphone permission is blocked." : "Voice dictation stopped. Try again.");
    };
    rec.onresult = (event) => {
      const el = target.current;
      if (!el?.isConnected || !editableTarget(el)) {
        target.current = null;
        setHasTarget(false);
        rec.stop();
        return;
      }
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal && result[0]?.transcript) insertTranscript(el, result[0].transcript);
      }
    };
    try {
      rec.start();
    } catch {
      setError("Voice dictation could not start. Try again.");
    }
  };

  if (!supported) return null;

  return (
    <aside className={`voice-dock${listening ? " listening" : ""}`} aria-live="polite">
      <div className="voice-copy">
        <strong>{listening ? "Listening…" : hasTarget ? "Dictate into this field" : "Tap a text field first"}</strong>
        <span>{error ?? (listening ? "Speak naturally. Tap stop when finished." : "Works for reflections, goals, evidence and plans.")}</span>
      </div>
      <select
        className="voice-lang"
        aria-label="Dictation language"
        value={language}
        onChange={(e) => {
          const next = e.target.value;
          setLanguage(next);
          window.localStorage.setItem("unlocking-life-voice-lang", next);
        }}
        disabled={listening}
      >
        {languages.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
      </select>
      <button
        type="button"
        className="voice-button"
        aria-pressed={listening}
        disabled={!hasTarget && !listening}
        onMouseDown={(e) => e.preventDefault()}
        onClick={listening ? stop : start}
        title="Voice recognition may use your browser's speech service."
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm6-3a6 6 0 0 1-12 0M12 17v4M9 21h6" />
        </svg>
        {listening ? "Stop" : "Speak"}
      </button>
    </aside>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Web Speech API belum ada di lib TS bawaan — deklarasi minimal yang kita pakai.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Input suara via Web Speech API (speech-to-text di browser).
 * Tekan sekali untuk mulai mendengarkan (tombol jadi merah), tekan lagi untuk
 * berhenti — transkrip final dikirim lewat `onFinal` sebagai TEKS biasa
 * (bukan audio). `onInterim` dipanggil tiap transkrip berubah untuk mengisi
 * input secara real-time. Mode continuous supaya tidak berhenti sendiri saat
 * pengguna jeda; berhenti hanya saat ditekan lagi.
 */
export function useVoiceInput({
  onInterim,
  onFinal,
  lang = "id-ID",
}: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  lang?: string;
}) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recRef.current?.stop(), []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = createRecognition();
    if (!rec) {
      toast.error("Browser ini belum mendukung input suara. Ketik saja ya.");
      return;
    }
    recRef.current = rec;
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    let transcript = "";
    rec.onresult = (e) => {
      transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      onInterim(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (transcript.trim()) onFinal(transcript.trim());
    };
    setListening(true);
    rec.start();
  }

  return { listening, toggle };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type Risk = "Rendah" | "Sedang" | "Tinggi";

interface AIResult {
  ringkasan_pola: string;
  tingkat_risiko: Risk;
  rekomendasi_bk: string[];
}

interface AIMeta {
  source: "gemini" | "fallback";
  warning?: string;
  cached?: boolean;
}

interface AIModalProps {
  studentId: string;
  studentName: string;
}

const RISK_STYLE: Record<Risk, string> = {
  Tinggi: "bg-red-100 text-red-700 border border-red-200",
  Sedang: "bg-amber-100 text-amber-700 border border-amber-200",
  Rendah: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

export function AIModal({ studentId, studentName }: AIModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIResult | null>(null);
  const [meta, setMeta] = useState<AIMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, refresh }),
        });
        const result = await res.json().catch(() => null);
        if (result?.success && result.data) {
          setAnalysis(result.data as AIResult);
          setMeta({
            source: result.source === "gemini" ? "gemini" : "fallback",
            warning: result.warning,
            cached: result.cached === true,
          });
        } else {
          setError(result?.error || "Analisis tidak dapat ditampilkan saat ini.");
        }
      } catch {
        setError("Terjadi kesalahan koneksi ke server.");
      } finally {
        setLoading(false);
      }
    },
    [studentId],
  );

  const openAndAnalyze = () => {
    setIsOpen(true);
    if (!analysis) void analyze();
  };

  // Tutup dengan tombol Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      <Button
        type="button"
        onClick={openAndAnalyze}
        size="sm"
        className="gap-1.5 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
      >
        <Sparkles className="h-4 w-4 text-yellow-300" />
        Analisis AI BK
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Analisis kedisiplinan ${studentName}`}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-950/50">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Analisis Kedisiplinan AI
                  </h3>
                  <p className="text-xs text-slate-500">{studentName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup"
                className="rounded p-1 text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Isi */}
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium text-slate-500">
                  Menganalisis pola perizinan siswa...
                </p>
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="text-sm">
                  <p className="font-medium">Analisis belum tersedia</p>
                  <p>{error}</p>
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-4 text-slate-700 dark:text-slate-200">
                {meta?.source === "fallback" && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {meta.warning ||
                        "Menampilkan analisis otomatis berbasis aturan (bukan AI)."}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/50">
                  <span className="text-sm font-medium">Tingkat Risiko:</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_STYLE[analysis.tingkat_risiko]}`}
                  >
                    {analysis.tingkat_risiko}
                  </span>
                </div>

                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Ringkasan Pola
                  </h4>
                  <p className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-800/30">
                    {analysis.ringkasan_pola}
                  </p>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Rekomendasi Tindakan BK
                  </h4>
                  <ul className="space-y-2">
                    {analysis.rekomendasi_bk.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-[11px] leading-snug text-slate-400">
                  Hasil ini hanya saran awal dari data perizinan. Keputusan dan
                  penanganan tetap pada pertimbangan Guru BK.
                  {meta?.cached ? " (hasil tersimpan sementara)" : ""}
                </p>
              </div>
            ) : null}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-2 border-t pt-3">
              {analysis && !loading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void analyze(true)}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Analisis ulang
                </Button>
              )}
              {error && !loading && (
                <Button type="button" variant="outline" size="sm" onClick={() => void analyze()}>
                  Coba lagi
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

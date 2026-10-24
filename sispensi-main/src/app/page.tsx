import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Globe,
  GraduationCap,
  MessageCircle,
  QrCode,
  ShieldCheck,
} from "lucide-react";

import { getSessionUser } from "@/lib/auth";
import { DASHBOARD_PATH } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: FilePlus2,
    title: "Ajukan Izin Online",
    desc: "Siswa mengajukan izin lengkap dengan alasan & bukti pendukung — tanpa kertas, dari HP maupun laptop.",
  },
  {
    icon: CalendarClock,
    title: "Deteksi Guru Otomatis",
    desc: "Sistem tahu siapa guru yang sedang mengajar dari jadwal, sehingga izin langsung tertuju ke penanggung jawab yang tepat.",
  },
  {
    icon: ClipboardCheck,
    title: "Persetujuan Berjenjang",
    desc: "Guru Mapel → Wali Kelas → Guru BK, dengan eskalasi otomatis bila approver tidak merespons.",
  },
  {
    icon: QrCode,
    title: "Surat Izin Digital + QR",
    desc: "Begitu disetujui, surat izin PDF ber-QR Code terbit otomatis dan bisa diverifikasi keabsahannya secara instan.",
  },
  {
    icon: BellRing,
    title: "Notifikasi Realtime",
    desc: "Pemberitahuan langsung (dengan suara) saat ada pengajuan baru atau keputusan — tanpa perlu refresh.",
  },
  {
    icon: BarChart3,
    title: "Rekap & Dashboard",
    desc: "Guru BK & Admin memantau tren perizinan dan rekap kedisiplinan siswa secara visual.",
  },
];

const steps = [
  { title: "Ajukan", desc: "Siswa mengisi jenis izin, alasan, dan bukti." },
  {
    title: "Disetujui",
    desc: "Diproses berjenjang otomatis oleh guru penanggung jawab.",
  },
  { title: "Terbit Surat", desc: "Surat izin PDF ber-QR Code terbit otomatis." },
  {
    title: "Verifikasi",
    desc: "Petugas memindai QR untuk memastikan keabsahan.",
  },
];

// Di luar komponen agar bebas aturan react-hooks/purity.
function currentYear(): number {
  return new Date().getFullYear();
}

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/stematelpwt/" },
  { label: "Facebook", href: "https://www.facebook.com/stematelpwt" },
  { label: "YouTube", href: "https://youtube.com/@stematelpwt" },
  { label: "TikTok", href: "https://www.tiktok.com/@stematelpwt" },
];

export default async function Home() {
  // Pengguna yang sudah login diarahkan ke dashboard.
  const user = await getSessionUser();
  if (user) redirect(DASHBOARD_PATH);

  return (
    <div className="flex min-h-svh flex-col">
      {/* Navbar */}
      <header className="bg-background border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-lg">
              <GraduationCap className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">SIPENSI</p>
              <p className="text-muted-foreground text-xs">
                SMK Telkom Purwokerto
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-brand text-brand-foreground hover:bg-brand-dark"
          >
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </header>

      {/* Hero — gradient merah Telkom */}
      <section className="from-brand to-brand-dark bg-gradient-to-br text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <ShieldCheck className="size-3.5" /> Sistem Perizinan Siswa Digital
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Perizinan Siswa, Kini Serba Digital
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-white/90 sm:text-lg">
            <strong className="text-white">SIPENSI</strong> menggantikan izin
            manual berbasis kertas dengan alur digital: ajukan izin online,
            disetujui berjenjang otomatis, lalu terbitkan surat izin ber-QR Code
            — tanpa perlu cetak.
          </p>

          {/* Pilihan masuk */}
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="text-brand-dark flex-1 bg-white shadow-sm hover:bg-white/90"
            >
              <Link href="/login?as=siswa">
                <GraduationCap className="size-5" /> Masuk sebagai Siswa
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="flex-1 border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/login?as=pengajar">
                <ClipboardCheck className="size-5" /> Masuk sebagai Pengajar
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-white/70">
            Akun dikelola sekolah. Peran (siswa/guru/admin) otomatis dikenali
            saat masuk.
          </p>
        </div>
      </section>

      {/* Tentang / Fitur */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Apa itu SIPENSI?
          </h2>
          <p className="text-muted-foreground mt-2">
            Aplikasi web perizinan siswa untuk SMK Telkom Purwokerto yang membuat
            proses izin lebih cepat, tercatat rapi, dan ramah lingkungan
            (paperless).
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="hover:border-brand/40 rounded-xl border p-5 transition-colors"
              >
                <div className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cara kerja */}
      <section className="bg-brand/5 border-y">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Cara Kerja
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="flex flex-col items-center text-center"
              >
                <div className="bg-brand flex size-10 items-center justify-center rounded-full font-semibold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-medium">{s.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
          <CheckCircle2 className="text-brand size-10" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Siap mengurus izin tanpa ribet?
          </h2>
          <p className="text-muted-foreground">
            Masuk dengan akun sekolahmu dan mulai ajukan atau proses izin secara
            digital.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-brand text-brand-foreground hover:bg-brand-dark"
          >
            <Link href="/login">
              Masuk ke SIPENSI <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <div className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-lg">
                  <GraduationCap className="size-5" />
                </div>
                <p className="font-semibold">SIPENSI</p>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                Sistem Perizinan Siswa Digital SMK Telkom Purwokerto — paperless,
                cepat, dan terverifikasi.
              </p>
            </div>

            {/* Tautan */}
            <div>
              <h3 className="text-sm font-semibold">Tautan</h3>
              <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/" className="hover:text-foreground">
                    Beranda
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Masuk
                  </Link>
                </li>
                <li>
                  <a
                    href="https://smktelkom-pwt.sch.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    Website Sekolah
                  </a>
                </li>
              </ul>
            </div>

            {/* Kontak */}
            <div>
              <h3 className="text-sm font-semibold">Kontak</h3>
              <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="https://wa.me/6281229701800"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground inline-flex items-center gap-2"
                  >
                    <MessageCircle className="size-4" /> +62 812-2970-1800
                  </a>
                </li>
                <li>
                  <a
                    href="https://smktelkom-pwt.sch.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground inline-flex items-center gap-2"
                  >
                    <Globe className="size-4" /> smktelkom-pwt.sch.id
                  </a>
                </li>
              </ul>
            </div>

            {/* Sosial */}
            <div>
              <h3 className="text-sm font-semibold">Ikuti Kami</h3>
              <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2 text-xs">@stematelpwt</p>
            </div>
          </div>

          <div className="text-muted-foreground mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs sm:flex-row">
            <p>
              © {currentYear()} SIPENSI — Sistem Perizinan Siswa Digital
            </p>
            <p>SMK Telkom Purwokerto</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

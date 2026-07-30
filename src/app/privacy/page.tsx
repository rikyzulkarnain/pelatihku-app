import type { Metadata } from "next";
import PhoneShell from "@/components/common/phone-shell";
import ScreenHeader from "@/components/common/screen-header";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — PelatihKu",
  description:
    "Kebijakan privasi PelatihKu: data apa yang kami kumpulkan, kenapa, dengan siapa dibagikan, dan bagaimana menghapusnya.",
  alternates: { canonical: "/privacy" },
};

// Tanggal berlaku kebijakan. Update manual kalau isi kebijakan berubah.
const EFFECTIVE_DATE = "30 Juli 2026";
const CONTACT_EMAIL = "rikyzulkarnain21@gmail.com";

const h2: React.CSSProperties = {
  font: "800 17px var(--font-archivo), sans-serif",
  color: "var(--ink)",
  margin: "28px 0 8px",
  letterSpacing: "-.01em",
};

const p: React.CSSProperties = {
  font: "500 14px/1.65 var(--font-jakarta), sans-serif",
  color: "var(--dim)",
  margin: "0 0 10px",
};

const ul: React.CSSProperties = {
  ...p,
  paddingLeft: 18,
  listStyle: "disc",
};

const strong: React.CSSProperties = { color: "var(--ink2)", fontWeight: 700 };

export default function PrivacyPage() {
  return (
    <PhoneShell>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "8px 28px 40px",
          overflowY: "auto",
        }}
        className="no-scrollbar"
      >
        <ScreenHeader back="/" />

        <h1
          style={{
            font: "900 28px/1.15 var(--font-archivo), sans-serif",
            color: "var(--ink)",
            margin: "22px 0 6px",
            letterSpacing: "-.02em",
          }}
        >
          Kebijakan Privasi
        </h1>
        <p
          style={{
            font: "600 12px var(--font-jakarta), sans-serif",
            color: "var(--faint)",
            margin: 0,
          }}
        >
          Berlaku sejak {EFFECTIVE_DATE}
        </p>

        <p style={{ ...p, marginTop: 20 }}>
          PelatihKu (&quot;kami&quot;) adalah aplikasi kebugaran pribadi yang menyusun
          program latihan, panduan nutrisi, dan coach AI. Halaman ini menjelaskan
          data apa yang kami kumpulkan, untuk apa, dengan siapa dibagikan, dan
          bagaimana kamu bisa menghapusnya.
        </p>

        <h2 style={h2}>1. Data yang kami kumpulkan</h2>
        <p style={p}>
          <span style={strong}>Data akun.</span> Nama, alamat email, dan kata sandi
          (disimpan dalam bentuk hash oleh penyedia autentikasi kami). Kalau kamu
          masuk lewat Google, kami menerima nama, email, dan foto profil dari akun
          Google-mu. Kami tidak pernah menerima kata sandi Google-mu.
        </p>
        <p style={p}>
          <span style={strong}>Data profil kebugaran.</span> Jenis kelamin, usia,
          berat badan, tinggi badan, tujuan latihan, level pengalaman, frekuensi
          latihan, peralatan yang tersedia, riwayat cedera, dan target tanggal.
          Data ini dipakai untuk menghitung TDEE serta target kalori dan protein
          harianmu.
        </p>
        <p style={p}>
          <span style={strong}>Data aktivitas.</span> Log latihan (beban, repetisi,
          set), log berat badan, log makanan/asupan protein, program yang
          dihasilkan, serta riwayat progres.
        </p>
        <p style={p}>
          <span style={strong}>Percakapan coach.</span> Pesan yang kamu kirim ke
          coach AI dan balasan yang dihasilkan, termasuk rekaman suara bila kamu
          memakai input suara (rekaman ditranskrip lalu tidak disimpan sebagai
          audio).
        </p>
        <p style={p}>
          <span style={strong}>Masukan.</span> Saran, laporan bug, dan halaman asal
          masukan yang kamu kirim lewat fitur feedback.
        </p>
        <p style={p}>
          <span style={strong}>Cookie teknis.</span> Kami memakai cookie sesi untuk
          menjaga kamu tetap login. Kami tidak memakai cookie iklan atau pelacak
          pihak ketiga untuk profiling.
        </p>

        <h2 style={h2}>2. Kenapa kami memakainya</h2>
        <ul style={ul}>
          <li>Menyusun dan menyesuaikan program latihan serta rencana nutrisi.</li>
          <li>Menghitung kebutuhan kalori, protein, dan progresi bebanmu.</li>
          <li>Memberi jawaban coach AI yang relevan dengan kondisimu.</li>
          <li>Menampilkan riwayat dan grafik progres.</li>
          <li>Menjaga keamanan akun dan memperbaiki bug.</li>
        </ul>
        <p style={p}>
          Kami <span style={strong}>tidak menjual</span> datamu dan tidak
          memakainya untuk iklan.
        </p>

        <h2 style={h2}>3. Data kesehatan sensitif</h2>
        <p style={p}>
          Sebagian data (berat badan, riwayat cedera, dan tujuan kesehatan seperti
          program kesuburan) tergolong data kesehatan. Kami hanya memprosesnya
          berdasarkan persetujuanmu saat mengisi onboarding, semata untuk
          menghasilkan program di dalam aplikasi. Kamu boleh mengosongkan atau
          mengubah data ini kapan saja dari halaman profil.
        </p>
        <p style={p}>
          PelatihKu bukan layanan medis. Isi aplikasi bersifat edukasi kebugaran
          dan bukan pengganti nasihat dokter.
        </p>

        <h2 style={h2}>4. Pihak ketiga yang memproses data</h2>
        <ul style={ul}>
          <li>
            <span style={strong}>Supabase</span> — autentikasi dan basis data
            tempat datamu disimpan.
          </li>
          <li>
            <span style={strong}>Google (Gemini API)</span> — memproses isi
            percakapan coach, data profil kebugaran yang relevan, dan rekaman
            suara untuk menghasilkan jawaban serta program. Data yang dikirim
            lewat API tidak dipakai Google untuk melatih model.
          </li>
          <li>
            <span style={strong}>Google Sign-In</span> — bila kamu memilih login
            dengan Google.
          </li>
          <li>
            <span style={strong}>Vercel</span> — hosting aplikasi dan log server
            teknis (alamat IP, waktu permintaan).
          </li>
        </ul>
        <p style={p}>
          Selain itu, kami hanya membuka data bila diwajibkan hukum.
        </p>

        <h2 style={h2}>5. Penyimpanan &amp; keamanan</h2>
        <p style={p}>
          Data disimpan selama akunmu aktif. Akses dibatasi per pengguna di level
          basis data (row level security), sehingga pengguna lain tidak bisa
          membaca datamu. Koneksi ke aplikasi dienkripsi lewat HTTPS. Admin dapat
          melihat masukan/feedback yang kamu kirim untuk menindaklanjutinya.
        </p>

        <h2 style={h2}>6. Hakmu</h2>
        <ul style={ul}>
          <li>Melihat dan mengubah data profil serta log dari dalam aplikasi.</li>
          <li>
            Meminta salinan datamu atau penghapusan akun beserta seluruh data
            terkait.
          </li>
          <li>Menarik persetujuan dengan berhenti memakai aplikasi.</li>
        </ul>
        <p style={p}>
          Untuk penghapusan akun, kirim email dari alamat yang terdaftar ke{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--acc)", fontWeight: 700 }}>
            {CONTACT_EMAIL}
          </a>
          . Permintaan diproses maksimal 30 hari. Menghapus akun akan menghapus
          program, log, dan percakapan coach-mu secara permanen.
        </p>

        <h2 style={h2}>7. Anak-anak</h2>
        <p style={p}>
          PelatihKu tidak ditujukan untuk pengguna di bawah 13 tahun. Kalau kami
          tahu ada akun anak di bawah usia tersebut, akunnya akan dihapus.
        </p>

        <h2 style={h2}>8. Perubahan kebijakan</h2>
        <p style={p}>
          Kalau kebijakan ini berubah, kami memperbarui tanggal berlaku di atas
          dan, untuk perubahan penting, memberi tahu lewat aplikasi.
        </p>

        <h2 style={h2}>9. Kontak</h2>
        <p style={p}>
          Pertanyaan soal privasi:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--acc)", fontWeight: 700 }}>
            {CONTACT_EMAIL}
          </a>
        </p>

        <div style={{ height: 24 }} />
      </div>
    </PhoneShell>
  );
}

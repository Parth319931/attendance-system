"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "4rem 1.5rem",
      textAlign: "center",
    }}>

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)",
        borderRadius: "999px", padding: "6px 18px", marginBottom: "2rem",
      }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px #3b82f6" }} />
        <span style={{ color: "#7aa2cc", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em" }}>
          AI-POWERED ATTENDANCE SYSTEM
        </span>
      </div>

      {/* Heading */}
      <h1 style={{
        fontSize: "clamp(2.2rem, 5vw, 4rem)",
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: "-0.03em",
        color: "#e2e8f0",
        marginBottom: "1.25rem",
        maxWidth: "750px",
      }}>
        Attendance Tracking<br />
        <span style={{ color: "#3b82f6", textShadow: "0 0 30px rgba(59,130,246,0.5)" }}>
          Powered by AI
        </span>
      </h1>

      {/* Subtitle */}
      <p style={{
        color: "#7aa2cc", fontSize: "1.05rem", maxWidth: "480px",
        lineHeight: 1.75, marginBottom: "2.5rem",
      }}>
        Upload a single class photo. Our face recognition model instantly marks attendance for every student — no manual work needed.
      </p>

      {/* CTA Buttons */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "5rem" }}>
        <Link href="/student/register" style={{
          background: "#2563eb", color: "white", textDecoration: "none",
          padding: "13px 28px", borderRadius: "10px", fontWeight: 600,
          fontSize: "0.95rem", boxShadow: "0 0 25px rgba(37,99,235,0.35)",
          letterSpacing: "0.01em", display: "inline-block",
        }}>
          Get Started →
        </Link>
        <Link href="/student/login" style={{
          background: "transparent", color: "#e2e8f0", textDecoration: "none",
          padding: "13px 28px", borderRadius: "10px", fontWeight: 500,
          fontSize: "0.95rem", border: "1px solid #1e3a5f", display: "inline-block",
        }}>
          Student Login
        </Link>
        <Link href="/teacher/login" style={{
          background: "transparent", color: "#7aa2cc", textDecoration: "none",
          padding: "13px 28px", borderRadius: "10px", fontWeight: 500,
          fontSize: "0.95rem", border: "1px solid #1e3a5f", display: "inline-block",
        }}>
          Teacher Login
        </Link>
      </div>

      {/* Feature Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1.25rem",
        maxWidth: "860px",
        width: "100%",
      }}>
        {[
          {
            icon: "📸",
            title: "One Photo",
            desc: "Teacher uploads one group photo after class. That's all that's needed.",
          },
          {
            icon: "⚡",
            title: "Instant Results",
            desc: "AI processes the photo and marks attendance in seconds automatically.",
          },
          {
            icon: "✏️",
            title: "Manual Override",
            desc: "Teachers can correct any AI errors with a single click.",
          },
        ].map((item, i) => (
          <div key={i} style={{
            background: "#0d1f3c",
            border: "1px solid #1e3a5f",
            borderRadius: "16px",
            padding: "1.75rem",
            textAlign: "left",
            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "#2563eb";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 25px rgba(37,99,235,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "#1e3a5f";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{item.icon}</div>
            <h3 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "1rem", marginBottom: "0.6rem" }}>
              {item.title}
            </h3>
            <p style={{ color: "#7aa2cc", fontSize: "0.875rem", lineHeight: 1.65 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
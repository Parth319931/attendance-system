import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "80vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "2rem"
    }}>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: "6rem",
        fontWeight: 700, color: "#1e3a5f", lineHeight: 1, marginBottom: "1rem"
      }}>
        404
      </div>
      <h1 style={{ color: "#e2e8f0", fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Page not found
      </h1>
      <p style={{ color: "#7aa2cc", fontSize: "0.95rem", marginBottom: "2rem", maxWidth: "360px" }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/" style={{
        background: "#2563eb", color: "white", textDecoration: "none",
        padding: "12px 28px", borderRadius: "10px", fontWeight: 600,
        fontSize: "0.95rem", boxShadow: "0 0 20px rgba(37,99,235,0.3)"
      }}>
        Back to Home
      </Link>
    </div>
  );
}
"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setRole(localStorage.getItem("role"));
    setName(localStorage.getItem("name"));
  }, [pathname]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  return (
    <nav style={{
      background: "rgba(2, 8, 23, 0.85)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid #1e3a5f",
      padding: "0 2rem",
      height: "64px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px", height: "32px",
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 15px rgba(37,99,235,0.4)",
          fontSize: "16px"
        }}>⚡</div>
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#e2e8f0", letterSpacing: "-0.02em" }}>
          Attend<span style={{ color: "#3b82f6" }}>AI</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {!token && (
          <>
            <Link href="/student/login" style={{
              color: "#7aa2cc", textDecoration: "none", padding: "6px 14px",
              borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500,
              transition: "color 0.2s"
            }}>
              Student Login
            </Link>
            <Link href="/teacher/login" style={{
              color: "#7aa2cc", textDecoration: "none", padding: "6px 14px",
              borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500,
            }}>
              Teacher Login
            </Link>
            <Link href="/student/register" style={{
              background: "#2563eb", color: "white", textDecoration: "none",
              padding: "7px 18px", borderRadius: "8px", fontSize: "0.875rem",
              fontWeight: 600, boxShadow: "0 0 15px rgba(37,99,235,0.3)",
              transition: "box-shadow 0.2s"
            }}>
              Register
            </Link>
          </>
        )}

        {token && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "#0d1f3c", border: "1px solid #1e3a5f",
              borderRadius: "8px", padding: "6px 12px"
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#10b981", boxShadow: "0 0 6px #10b981"
              }} />
              <span style={{ color: "#7aa2cc", fontSize: "0.8rem" }}>{name}</span>
              <span style={{
                background: "rgba(37,99,235,0.2)", color: "#3b82f6",
                padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem",
                fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"
              }}>{role}</span>
            </div>

            {role === "student" && (
              <Link href="/student/dashboard" style={{
                color: "#7aa2cc", textDecoration: "none", padding: "6px 14px",
                borderRadius: "8px", fontSize: "0.875rem"
              }}>
                Dashboard
              </Link>
            )}
            {role === "teacher" && (
              <Link href="/teacher/dashboard" style={{
                color: "#7aa2cc", textDecoration: "none", padding: "6px 14px",
                borderRadius: "8px", fontSize: "0.875rem"
              }}>
                Dashboard
              </Link>
            )}
            <button onClick={handleLogout} style={{
              background: "transparent", border: "1px solid #1e3a5f",
              color: "#7aa2cc", padding: "6px 14px", borderRadius: "8px",
              fontSize: "0.875rem", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
              transition: "border-color 0.2s, color 0.2s"
            }}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
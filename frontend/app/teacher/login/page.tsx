"use client";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { teacherLogin } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

type FormData = { email: string; password: string };

export default function TeacherLoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const response = await teacherLogin(data.email, data.password);
      localStorage.setItem("token", response.access_token);
      localStorage.setItem("role", response.role);
      localStorage.setItem("name", response.name);

      // Decode teacher_id from token
      const payload = JSON.parse(atob(response.access_token.split(".")[1]));
      localStorage.setItem("uid", payload.sub);

      toast.success(`Welcome, ${response.name}!`);
      router.push("/teacher/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", background: "#0a1628", border: "1px solid #1e3a5f",
    borderRadius: "10px", padding: "0.75rem 1rem", color: "#e2e8f0",
    fontFamily: "Space Grotesk, sans-serif", fontSize: "0.95rem", outline: "none",
  };

  const labelStyle = {
    display: "block", fontSize: "0.75rem", fontWeight: 600 as const,
    color: "#7aa2cc", marginBottom: "0.5rem",
    letterSpacing: "0.08em", textTransform: "uppercase" as const,
  };

  return (
    <div style={{ maxWidth: "440px", margin: "4rem auto", padding: "0 1rem" }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "2rem", textAlign: "center" }}>
        <div style={{
          width: "56px", height: "56px",
          background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
          borderRadius: "16px", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 1.25rem",
          fontSize: "1.5rem", boxShadow: "0 0 25px rgba(37,99,235,0.4)"
        }}>🎓</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          Teacher Login
        </h1>
        <p style={{ color: "#7aa2cc", fontSize: "0.9rem" }}>
          Sign in to manage attendance for your classes
        </p>
      </div>

      <div className="card animate-fade-up-delay-1">
        <form onSubmit={handleSubmit(onSubmit)}>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              style={inputStyle}
              placeholder="teacher@college.com"
            />
            {errors.email && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.email.message}</p>}
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              {...register("password", { required: "Password is required" })}
              style={inputStyle}
              placeholder="Your password"
            />
            {errors.password && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} style={{
            width: "100%", background: "#2563eb", color: "white",
            padding: "0.9rem", borderRadius: "10px", fontWeight: 600,
            fontSize: "1rem", border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Space Grotesk, sans-serif", opacity: loading ? 0.6 : 1,
            boxShadow: "0 0 20px rgba(37,99,235,0.3)", transition: "all 0.2s",
          }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        {/* Info box */}
        <div style={{
          marginTop: "1.5rem", padding: "1rem",
          background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
          borderRadius: "10px",
        }}>
          <p style={{ color: "#7aa2cc", fontSize: "0.8rem", lineHeight: 1.6 }}>
            🔒 Teacher accounts are created by the system administrator. Contact your admin if you don't have access.
          </p>
        </div>

        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <Link href="/student/login" style={{ color: "#3d6494", fontSize: "0.85rem", textDecoration: "none" }}>
            Are you a student? <span style={{ color: "#3b82f6" }}>Login here</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
"use client";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { registerStudent, getAllSubjects } from "@/lib/api";
import Link from "next/link";

type Subject = { subject_code: string; subject_name: string; branch: string };
type FormData = { uid: string; full_name: string; email: string; password: string; branch: string; division: string };

export default function StudentRegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllSubjects().then((data) => setSubjects(data.subjects));
  }, []);

  const toggleSubject = (code: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFaceImage(file); setPreview(URL.createObjectURL(file)); }
  };

  const onSubmit = async (data: FormData) => {
    if (!faceImage) return toast.error("Please upload your face photo");
    if (selectedSubjects.length === 0) return toast.error("Select at least one subject");
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      formData.append("subject_codes", selectedSubjects.join(","));
      formData.append("face_image", faceImage);
      await registerStudent(formData);
      toast.success("Registered successfully!");
      router.push("/student/login");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", background: "#0a1628", border: "1px solid #1e3a5f",
    borderRadius: "10px", padding: "0.75rem 1rem", color: "#e2e8f0",
    fontFamily: "Space Grotesk, sans-serif", fontSize: "0.95rem", outline: "none",
  };

  const labelStyle = {
    display: "block", fontSize: "0.75rem", fontWeight: 600,
    color: "#7aa2cc", marginBottom: "0.5rem", letterSpacing: "0.08em", textTransform: "uppercase" as const,
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          Create Account
        </h1>
        <p style={{ color: "#7aa2cc" }}>
          Already registered?{" "}
          <Link href="/student/login" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}>Sign in here</Link>
        </p>
      </div>

      <div className="card animate-fade-up-delay-1">
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* UID + Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={labelStyle}>Student UID</label>
              <input {...register("uid", { required: "Required" })} style={inputStyle} placeholder="2021CS001" className="mono" />
              {errors.uid && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.uid.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input {...register("full_name", { required: "Required" })} style={inputStyle} placeholder="Your full name" />
              {errors.full_name && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.full_name.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>Email Address</label>
            <input type="email" {...register("email", { required: "Required" })} style={inputStyle} placeholder="your@email.com" />
            {errors.email && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>Password</label>
            <input type="password" {...register("password", { required: "Required", minLength: { value: 6, message: "Min 6 characters" } })} style={inputStyle} placeholder="Create a strong password" />
            {errors.password && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px" }}>{errors.password.message}</p>}
          </div>

          {/* Branch + Division */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={labelStyle}>Branch</label>
              <select {...register("branch", { required: "Required" })} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select Branch</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Division</label>
              <select {...register("division", { required: "Required" })} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select Division</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
                <option value="D">Division D</option>
              </select>
            </div>
          </div>

          {/* Subjects */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Subjects — Select all that apply</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {subjects.map((subject) => {
                const selected = selectedSubjects.includes(subject.subject_code);
                return (
                  <div key={subject.subject_code} onClick={() => toggleSubject(subject.subject_code)} style={{
                    cursor: "pointer", border: `1px solid ${selected ? "#2563eb" : "#1e3a5f"}`,
                    borderRadius: "10px", padding: "0.85rem 1rem",
                    background: selected ? "rgba(37,99,235,0.15)" : "#0a1628",
                    boxShadow: selected ? "0 0 15px rgba(37,99,235,0.2)" : "none",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", color: selected ? "#3b82f6" : "#7aa2cc", fontWeight: 600 }}>
                      {subject.subject_code}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: selected ? "#e2e8f0" : "#3d6494", marginTop: "2px" }}>
                      {subject.subject_name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Face Image */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={labelStyle}>Face Photo</label>
            <div onClick={() => fileRef.current?.click()} style={{
              border: `2px dashed ${preview ? "#2563eb" : "#1e3a5f"}`,
              borderRadius: "12px", padding: "2rem", textAlign: "center",
              cursor: "pointer", background: preview ? "rgba(37,99,235,0.05)" : "#0a1628",
              transition: "all 0.2s",
            }}>
              {preview ? (
                <div>
                  <img src={preview} alt="Preview" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "50%", margin: "0 auto 0.75rem", display: "block", border: "2px solid #2563eb", boxShadow: "0 0 20px rgba(37,99,235,0.4)" }} />
                  <p style={{ color: "#7aa2cc", fontSize: "0.8rem" }}>Click to change photo</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📷</div>
                  <p style={{ color: "#7aa2cc", fontSize: "0.9rem", marginBottom: "4px" }}>Click to upload face photo</p>
                  <p style={{ color: "#3d6494", fontSize: "0.8rem" }}>Clear, front-facing photo gives best results</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: "100%", background: loading ? "#1e3a5f" : "#2563eb",
            color: "white", padding: "0.9rem", borderRadius: "10px",
            fontWeight: 600, fontSize: "1rem", border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Space Grotesk, sans-serif", letterSpacing: "0.01em",
            boxShadow: loading ? "none" : "0 0 20px rgba(37,99,235,0.4)",
            transition: "all 0.2s",
          }}>
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>
      </div>
    </div>
  );
}
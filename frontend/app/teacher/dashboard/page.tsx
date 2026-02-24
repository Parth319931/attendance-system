"use client";
import { useEffect, useState, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import {
  getAllSubjects,
  getTeacherSubjects,
  assignSubjectToTeacher,
  getAttendanceBySession,
  manualOverride,
  uploadClassPhoto,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

type Subject = { subject_code: string; subject_name: string; branch: string };
type TeacherSubject = { subject_code: string; division: string };
type AttendanceRecord = {
  student_uid: string;
  full_name: string;
  status: string;
  is_manual_override: boolean;
};

type Step = "select" | "upload" | "results";

export default function TeacherDashboard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [step, setStep] = useState<Step>("select");

  // Step 1 — Session selection
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);

  // Step 2 — Photo upload
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Step 3 — Results
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overriding, setOverriding] = useState<string | null>(null);

  // Assign subject panel
  const [showAssign, setShowAssign] = useState(false);
  const [assignSubject, setAssignSubject] = useState("");
  const [assignDivision, setAssignDivision] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  if (!token || role !== "teacher") { router.push("/teacher/login"); return; }

  const payload = JSON.parse(atob(token.split(".")[1]));
  setTeacherId(payload.sub);
  setTeacherName(localStorage.getItem("name") || "");

  getAllSubjects().then((d) => setAllSubjects(d.subjects));
  loadTeacherSubjects(payload.sub);

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };
}, []);

  const loadTeacherSubjects = async (tid: string) => {
    try {
      const data = await getTeacherSubjects(tid);
      setTeacherSubjects(data.subjects);
    } catch { }
  };

  const handleAssignSubject = async () => {
    if (!assignSubject || !assignDivision) return toast.error("Select subject and division");
    setAssigning(true);
    try {
      await assignSubjectToTeacher(teacherId, assignSubject, assignDivision);
      toast.success("Subject assigned!");
      setShowAssign(false);
      setAssignSubject("");
      setAssignDivision("");
      loadTeacherSubjects(teacherId);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to assign subject");
    } finally { setAssigning(false); }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const handleUploadPhoto = async () => {
  if (!photo) return toast.error("Please select a class photo");
  setUploading(true);
  try {
    // Step 1: Send photo directly to local ML server
    const mlFormData = new FormData();
    mlFormData.append("file", photo);
    
    let presentUids: string[] = [];
    try {
      const mlResult = await axios.post("http://localhost:8001/recognize", mlFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      presentUids = mlResult.data.present_uids;
      toast.success(`ML recognized ${presentUids.length} students`);
    } catch {
      toast.error("ML server not reachable — marking all absent");
    }

    // Step 2: Send results to backend to save attendance
    const backendFormData = new FormData();
    backendFormData.append("file", photo);
    backendFormData.append("subject_code", selectedSubject);
    backendFormData.append("division", selectedDivision);
    backendFormData.append("date", sessionDate);
    backendFormData.append("teacher_id", teacherId);
    backendFormData.append("present_uids", JSON.stringify(presentUids));

    await uploadClassPhoto(backendFormData);
    toast.success("Attendance saved!");
    await loadAttendanceResults();
    setStep("results");
  } catch (error: any) {
    toast.error(error.response?.data?.detail || "Upload failed");
  } finally { setUploading(false); }
};

  const loadAttendanceResults = async () => {
  try {
    const data = await getAttendanceBySession(selectedSubject, selectedDivision, sessionDate);
    setAttendance(data.attendance);

    // Set up realtime for this session
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`teacher-attendance-${selectedSubject}-${selectedDivision}-${sessionDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `subject_code=eq.${selectedSubject}`,
        },
        (payload) => {
          const { eventType, new: newRecord } = payload;
          if (eventType === "UPDATE") {
            setAttendance((prev) =>
              prev.map((a) =>
                a.student_uid === newRecord.student_uid
                  ? { ...a, status: newRecord.status, is_manual_override: newRecord.is_manual_override }
                  : a
              )
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  } catch {
    toast.error("Could not load results");
  }
};

  const handleManualOverride = async (studentUid: string) => {
    setOverriding(studentUid);
    try {
      await manualOverride(studentUid, selectedSubject, sessionDate, selectedDivision);
      toast.success(`Marked ${studentUid} as present`);
      setAttendance((prev) =>
        prev.map((a) => a.student_uid === studentUid ? { ...a, status: "present", is_manual_override: true } : a)
      );
    } catch { toast.error("Override failed"); }
    finally { setOverriding(null); }
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

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;

  return (
    <AuthGuard requiredRole="teacher">
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ color: "#7aa2cc", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Teacher Dashboard</p>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
              Welcome, <span style={{ color: "#3b82f6" }}>{teacherName}</span>
            </h1>
            <p style={{ color: "#3d6494", fontSize: "0.85rem", fontFamily: "JetBrains Mono, monospace", marginTop: "4px" }}>
              ID: {teacherId}
            </p>
          </div>
          <button onClick={() => setShowAssign(!showAssign)} style={{
            background: showAssign ? "#1e3a5f" : "rgba(37,99,235,0.15)",
            border: "1px solid #2563eb", color: "#3b82f6",
            padding: "8px 18px", borderRadius: "8px", fontSize: "0.85rem",
            fontWeight: 600, cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
            transition: "all 0.2s",
          }}>
            {showAssign ? "✕ Cancel" : "+ Assign Subject"}
          </button>
        </div>

        {/* Assign Subject Panel */}
        {showAssign && (
          <div className="card animate-fade-up" style={{ marginBottom: "1.5rem", borderColor: "rgba(37,99,235,0.4)" }}>
            <h3 style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: "1.25rem" }}>Assign a Subject to Yourself</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Subject</label>
                <select value={assignSubject} onChange={(e) => setAssignSubject(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select Subject</option>
                  {allSubjects.map((s) => (
                    <option key={s.subject_code} value={s.subject_code}>{s.subject_code} — {s.subject_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Division</label>
                <select value={assignDivision} onChange={(e) => setAssignDivision(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select Division</option>
                  {["A", "B", "C", "D"].map((d) => <option key={d} value={d}>Division {d}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAssignSubject} disabled={assigning} style={{
              background: "#2563eb", color: "white", border: "none",
              padding: "10px 24px", borderRadius: "8px", fontWeight: 600,
              fontSize: "0.9rem", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
              opacity: assigning ? 0.6 : 1,
            }}>
              {assigning ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        )}

        {/* My Subjects */}
        {teacherSubjects.length > 0 && (
          <div className="animate-fade-up-delay-1" style={{ marginBottom: "2rem" }}>
            <p style={labelStyle}>Your Assigned Subjects</p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {teacherSubjects.map((ts, i) => (
                <div key={i} style={{
                  background: "#0d1f3c", border: "1px solid #1e3a5f",
                  borderRadius: "8px", padding: "6px 14px",
                  display: "flex", gap: "8px", alignItems: "center",
                }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#3b82f6", fontSize: "0.82rem", fontWeight: 600 }}>{ts.subject_code}</span>
                  <span style={{ color: "#3d6494", fontSize: "0.75rem" }}>Div {ts.division}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="animate-fade-up-delay-1" style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "2rem" }}>
          {[
            { key: "select", label: "1. Select Session" },
            { key: "upload", label: "2. Upload Photo" },
            { key: "results", label: "3. View Results" },
          ].map((s, i) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                padding: "6px 16px", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600,
                background: step === s.key ? "rgba(37,99,235,0.2)" : "transparent",
                color: step === s.key ? "#3b82f6" : "#3d6494",
                border: step === s.key ? "1px solid rgba(37,99,235,0.4)" : "1px solid transparent",
                transition: "all 0.2s",
              }}>
                {s.label}
              </div>
              {i < 2 && <div style={{ width: "40px", height: "1px", background: "#1e3a5f" }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Select Session ── */}
        {step === "select" && (
          <div className="card animate-fade-up">
            <h2 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              Select Today's Session
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={labelStyle}>Subject</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select Subject</option>
                  {teacherSubjects.map((ts) => {
                    const subjectInfo = allSubjects.find((s) => s.subject_code === ts.subject_code);
                    return (
                      <option key={`${ts.subject_code}-${ts.division}`} value={ts.subject_code}>
                        {ts.subject_code} — {subjectInfo?.subject_name || ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Division</label>
                <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select Division</option>
                  {teacherSubjects
                    .filter((ts) => ts.subject_code === selectedSubject)
                    .map((ts) => (
                      <option key={ts.division} value={ts.division}>Division {ts.division}</option>
                    ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "1.75rem" }}>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => {
                if (!selectedSubject || !selectedDivision) return toast.error("Please select subject and division");
                setStep("upload");
              }}
              style={{
                background: "#2563eb", color: "white", border: "none",
                padding: "0.9rem 2rem", borderRadius: "10px", fontWeight: 600,
                fontSize: "0.95rem", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
                boxShadow: "0 0 20px rgba(37,99,235,0.3)", transition: "all 0.2s",
              }}>
              Continue to Photo Upload →
            </button>
          </div>
        )}

        {/* ── STEP 2: Upload Photo ── */}
        {step === "upload" && (
          <div className="card animate-fade-up">
            {/* Session Info */}
            <div style={{
              display: "flex", gap: "1rem", marginBottom: "1.75rem",
              padding: "1rem", background: "#0a1628", borderRadius: "10px",
              border: "1px solid #1e3a5f", flexWrap: "wrap",
            }}>
              {[
                { label: "Subject", value: selectedSubject },
                { label: "Division", value: `Division ${selectedDivision}` },
                { label: "Date", value: sessionDate },
              ].map((item) => (
                <div key={item.label}>
                  <p style={{ color: "#3d6494", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</p>
                  <p style={{ color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem", fontWeight: 600 }}>{item.value}</p>
                </div>
              ))}
            </div>

            <h2 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "1.1rem", marginBottom: "1.25rem" }}>
              Upload Class Photo
            </h2>

            {/* Upload Area */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${photoPreview ? "#2563eb" : "#1e3a5f"}`,
                borderRadius: "14px", padding: "2.5rem", textAlign: "center",
                cursor: "pointer", background: photoPreview ? "rgba(37,99,235,0.05)" : "#0a1628",
                transition: "all 0.2s", marginBottom: "1.5rem",
              }}
            >
              {photoPreview ? (
                <div>
                  <img src={photoPreview} alt="Class photo preview" style={{
                    maxWidth: "100%", maxHeight: "280px", objectFit: "cover",
                    borderRadius: "10px", margin: "0 auto", display: "block",
                    border: "1px solid #2563eb", boxShadow: "0 0 20px rgba(37,99,235,0.3)"
                  }} />
                  <p style={{ color: "#7aa2cc", fontSize: "0.8rem", marginTop: "1rem" }}>
                    Click to change photo
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📷</div>
                  <p style={{ color: "#7aa2cc", fontSize: "0.95rem", marginBottom: "6px" }}>
                    Click to upload class photo
                  </p>
                  <p style={{ color: "#3d6494", fontSize: "0.82rem" }}>
                    Make sure all students' faces are visible
                  </p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setStep("select")} style={{
                background: "transparent", color: "#7aa2cc", border: "1px solid #1e3a5f",
                padding: "0.85rem 1.5rem", borderRadius: "10px", fontWeight: 500,
                fontSize: "0.9rem", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
              }}>
                ← Back
              </button>
              <button onClick={handleUploadPhoto} disabled={uploading || !photo} style={{
                flex: 1, background: photo ? "#2563eb" : "#1e3a5f",
                color: photo ? "white" : "#3d6494", border: "none",
                padding: "0.85rem", borderRadius: "10px", fontWeight: 600,
                fontSize: "0.95rem", cursor: photo ? "pointer" : "not-allowed",
                fontFamily: "Space Grotesk, sans-serif",
                boxShadow: photo ? "0 0 20px rgba(37,99,235,0.3)" : "none",
                transition: "all 0.2s",
              }}>
                {uploading ? "Processing with AI..." : "Process Photo & Mark Attendance →"}
              </button>
            </div>

            {/* Note about ML */}
            <div style={{
              marginTop: "1.25rem", padding: "0.85rem 1rem",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "8px",
            }}>
              <p style={{ color: "#f59e0b", fontSize: "0.78rem", lineHeight: 1.6 }}>
                ⚠️ The AI face recognition model will be connected in Phase 8. For now, upload will succeed once the ML server is running.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Results ── */}
        {step === "results" && (
          <div className="animate-fade-up">

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace" }}>
                  {attendance.length}
                </div>
                <div style={{ color: "#7aa2cc", fontSize: "0.75rem", marginTop: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Total</div>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981", fontFamily: "JetBrains Mono, monospace", textShadow: "0 0 15px rgba(16,185,129,0.4)" }}>
                  {presentCount}
                </div>
                <div style={{ color: "#7aa2cc", fontSize: "0.75rem", marginTop: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Present</div>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#ef4444", fontFamily: "JetBrains Mono, monospace", textShadow: "0 0 15px rgba(239,68,68,0.4)" }}>
                  {absentCount}
                </div>
                <div style={{ color: "#7aa2cc", fontSize: "0.75rem", marginTop: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Absent</div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "1rem" }}>Attendance Results</h2>
                  <p style={{ color: "#3d6494", fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace", marginTop: "2px" }}>
                    {selectedSubject} · Div {selectedDivision} · {sessionDate}
                  </p>
                </div>
                <button onClick={() => { setStep("select"); setPhoto(null); setPhotoPreview(null); setAttendance([]); }} style={{
                  background: "transparent", border: "1px solid #1e3a5f", color: "#7aa2cc",
                  padding: "6px 14px", borderRadius: "8px", fontSize: "0.8rem",
                  cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
                }}>
                  New Session
                </button>
              </div>

              {attendance.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#3d6494" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📋</div>
                  <p>No attendance records found for this session</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#0a1628" }}>
                      {["Student UID", "Name", "Status", "Override"].map((h) => (
                        <th key={h} style={{ padding: "0.875rem 1.5rem", textAlign: "left", color: "#7aa2cc", fontSize: "0.73rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #1e3a5f" }}>
                        <td style={{ padding: "1rem 1.5rem", fontFamily: "JetBrains Mono, monospace", color: "#3b82f6", fontSize: "0.875rem", fontWeight: 500 }}>
                          {record.student_uid}
                        </td>
                        <td style={{ padding: "1rem 1.5rem", color: "#e2e8f0", fontSize: "0.875rem" }}>
                          {record.full_name}
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <span className={record.status === "present" ? "badge-present" : "badge-absent"}>
                            {record.status.toUpperCase()}
                            {record.is_manual_override && " ✏️"}
                          </span>
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          {record.status === "absent" && (
                            <button
                              onClick={() => handleManualOverride(record.student_uid)}
                              disabled={overriding === record.student_uid}
                              style={{
                                background: "rgba(16,185,129,0.1)", color: "#10b981",
                                border: "1px solid rgba(16,185,129,0.3)", padding: "5px 14px",
                                borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600,
                                cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
                                opacity: overriding === record.student_uid ? 0.5 : 1,
                                transition: "all 0.2s",
                              }}>
                              {overriding === record.student_uid ? "Marking..." : "Mark Present"}
                            </button>
                          )}
                          {record.status === "present" && (
                            <span style={{ color: "#3d6494", fontSize: "0.78rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
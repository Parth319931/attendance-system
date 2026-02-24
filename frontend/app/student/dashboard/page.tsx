"use client";
import { useEffect, useState, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { getStudentAttendance } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type AttendanceRecord = {
  id?: number;
  subject_code: string;
  date: string;
  status: string;
  is_manual_override: boolean;
  division: string;
};

export default function StudentDashboard() {
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [uid, setUid] = useState("");
  const [newUpdate, setNewUpdate] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "student") { router.push("/student/login"); return; }

    const storedName = localStorage.getItem("name") || "";
    setName(storedName);

    const payload = JSON.parse(atob(token.split(".")[1]));
    const studentUid = payload.sub;
    setUid(studentUid);

    // Initial load
    loadAttendance(studentUid);

    // Set up Realtime subscription
    setupRealtime(studentUid);

    return () => {
      // Cleanup subscription on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const loadAttendance = async (studentUid: string) => {
    try {
      const data = await getStudentAttendance(studentUid);
      setAttendance(data.attendance);
    } catch {
      router.push("/student/login");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = (studentUid: string) => {
    // Subscribe to changes in the attendance table for this student
    const channel = supabase
      .channel(`attendance-${studentUid}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "attendance",
          filter: `student_uid=eq.${studentUid}`,
        },
        (payload) => {
          console.log("Realtime update received:", payload);
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    channelRef.current = channel;
  };

  const handleRealtimeUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === "INSERT") {
      // New attendance record added
      setAttendance((prev) => {
        const exists = prev.some(
          (r) => r.subject_code === newRecord.subject_code && r.date === newRecord.date
        );
        if (exists) return prev;
        return [newRecord, ...prev];
      });
      setNewUpdate(`New attendance recorded for ${newRecord.subject_code}`);
      setTimeout(() => setNewUpdate(null), 4000);
    }

    if (eventType === "UPDATE") {
      // Existing record updated (manual override or ML reprocess)
      setAttendance((prev) =>
        prev.map((r) =>
          r.subject_code === newRecord.subject_code && r.date === newRecord.date
            ? { ...r, status: newRecord.status, is_manual_override: newRecord.is_manual_override }
            : r
        )
      );
      const statusText = newRecord.status === "present" ? "✅ Present" : "❌ Absent";
      setNewUpdate(`${newRecord.subject_code} updated to ${statusText}`);
      setTimeout(() => setNewUpdate(null), 4000);
    }
  };

  const present = attendance.filter((a) => a.status === "present").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const percentage = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;
  const percentageColor = percentage >= 75 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <AuthGuard requiredRole="student">
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Realtime Update Toast */}
        {newUpdate && (
          <div style={{
            position: "fixed", top: "80px", right: "24px", zIndex: 1000,
            background: "#0d1f3c", border: "1px solid #2563eb",
            borderRadius: "12px", padding: "14px 20px",
            boxShadow: "0 0 30px rgba(37,99,235,0.4)",
            animation: "fadeInUp 0.3s ease",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#3b82f6", boxShadow: "0 0 8px #3b82f6",
              animation: "pulse-glow 1s infinite",
            }} />
            <span style={{ color: "#e2e8f0", fontSize: "0.875rem", fontWeight: 500 }}>
              {newUpdate}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "#7aa2cc", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              Student Dashboard
            </p>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
              Welcome, <span style={{ color: "#3b82f6" }}>{name}</span>
            </h1>
            <p style={{ color: "#3d6494", fontSize: "0.8rem", fontFamily: "JetBrains Mono, monospace", marginTop: "4px" }}>
              UID: {uid}
            </p>
          </div>

          {/* Live indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: "#0d1f3c", border: "1px solid #1e3a5f",
            borderRadius: "8px", padding: "8px 14px",
          }}>
            <div style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: "#10b981", boxShadow: "0 0 8px #10b981",
            }} />
            <span style={{ color: "#7aa2cc", fontSize: "0.78rem", fontWeight: 500 }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-up-delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: percentageColor, fontFamily: "JetBrains Mono, monospace", textShadow: `0 0 20px ${percentageColor}60` }}>
              {percentage}%
            </div>
            <div style={{ color: "#7aa2cc", fontSize: "0.78rem", marginTop: "0.5rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>Overall</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#10b981", fontFamily: "JetBrains Mono, monospace", textShadow: "0 0 20px rgba(16,185,129,0.4)" }}>
              {present}
            </div>
            <div style={{ color: "#7aa2cc", fontSize: "0.78rem", marginTop: "0.5rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>Present</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#ef4444", fontFamily: "JetBrains Mono, monospace", textShadow: "0 0 20px rgba(239,68,68,0.4)" }}>
              {absent}
            </div>
            <div style={{ color: "#7aa2cc", fontSize: "0.78rem", marginTop: "0.5rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>Absent</div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="card animate-fade-up-delay-2" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "1rem" }}>
              Attendance Records
            </h2>
            <span style={{ color: "#3d6494", fontSize: "0.78rem" }}>
              {attendance.length} total records
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#7aa2cc" }}>
              <div style={{ width: "32px", height: "32px", border: "2px solid #1e3a5f", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
              Loading records...
            </div>
          ) : attendance.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#3d6494" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
              <p>No attendance records yet</p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                Records appear instantly when your teacher marks attendance
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0a1628" }}>
                  {["Subject", "Date", "Division", "Status"].map((h) => (
                    <th key={h} style={{ padding: "0.875rem 1.5rem", textAlign: "left", color: "#7aa2cc", fontSize: "0.73rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, i) => (
                  <tr
                    key={i}
                    style={{ borderTop: "1px solid #1e3a5f", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#0d1f3c")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "1rem 1.5rem", fontFamily: "JetBrains Mono, monospace", color: "#3b82f6", fontSize: "0.875rem", fontWeight: 500 }}>
                      {record.subject_code}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", color: "#7aa2cc", fontSize: "0.875rem" }}>
                      {record.date}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", color: "#7aa2cc", fontSize: "0.875rem" }}>
                      Div {record.division}
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span className={record.status === "present" ? "badge-present" : "badge-absent"}>
                        {record.status.toUpperCase()}
                        {record.is_manual_override && " ✏️"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
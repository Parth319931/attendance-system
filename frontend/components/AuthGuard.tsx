"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: "student" | "teacher";
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.push(requiredRole === "student" ? "/student/login" : "/teacher/login");
      return;
    }

    // Check token expiry
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiry = payload.exp * 1000;
      if (Date.now() > expiry) {
        localStorage.clear();
        router.push(requiredRole === "student" ? "/student/login" : "/teacher/login");
        return;
      }
    } catch {
      localStorage.clear();
      router.push("/");
      return;
    }

    if (role !== requiredRole) {
      router.push(requiredRole === "student" ? "/student/login" : "/teacher/login");
      return;
    }

    setAuthorized(true);
  }, []);

  if (!authorized) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{
          width: "36px", height: "36px",
          border: "2px solid #1e3a5f", borderTopColor: "#3b82f6",
          borderRadius: "50%", animation: "spin 0.8s linear infinite"
        }} />
      </div>
    );
  }

  return <>{children}</>;
}
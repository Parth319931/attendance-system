import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry globally
// Only redirect on 401 if user is already logged in (has a token)
// If no token exists, it means it's a login attempt with wrong credentials
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      if (token) {
        // Token expired — clear and redirect
        localStorage.clear();
        window.location.href = "/";
      }
      // If no token, this is a failed login attempt
      // Let the login page handle showing the error message
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ────────────────────────────────────────────
export const studentLogin = async (email: string, password: string) => {
  const response = await api.post("/auth/student/login", { email, password });
  return response.data;
};

export const teacherLogin = async (email: string, password: string) => {
  const response = await api.post("/auth/teacher/login", { email, password });
  return response.data;
};

// ─── STUDENT ─────────────────────────────────────────
export const registerStudent = async (formData: FormData) => {
  const response = await api.post("/students/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getStudentDetails = async (uid: string) => {
  const response = await api.get(`/students/${uid}`);
  return response.data;
};

export const getStudentAttendance = async (uid: string) => {
  const response = await api.get(`/attendance/student/${uid}`);
  return response.data;
};

// ─── TEACHER ─────────────────────────────────────────
export const getTeacherSubjects = async (teacherId: string) => {
  const response = await api.get(`/teachers/${teacherId}/subjects`);
  return response.data;
};

export const assignSubjectToTeacher = async (
  teacherId: string,
  subjectCode: string,
  division: string
) => {
  const response = await api.post(
    `/teachers/${teacherId}/assign-subject?subject_code=${subjectCode}&division=${division}`
  );
  return response.data;
};

// ─── ATTENDANCE ──────────────────────────────────────
export const getAllSubjects = async () => {
  const response = await api.get("/attendance/subjects");
  return response.data;
};

export const getAttendanceBySession = async (
  subjectCode: string,
  division: string,
  date: string
) => {
  const response = await api.get(`/attendance/${subjectCode}/${division}/${date}`);
  return response.data;
};

export const manualOverride = async (
  studentUid: string,
  subjectCode: string,
  date: string,
  division: string
) => {
  const response = await api.post("/attendance/manual-override", {
    student_uid: studentUid,
    subject_code: subjectCode,
    date,
    division,
  });
  return response.data;
};

export const uploadClassPhoto = async (formData: FormData) => {
  const response = await api.post("/ml/recognize", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
export default function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
      <div style={{
        width: "36px", height: "36px",
        border: "2px solid #1e3a5f",
        borderTopColor: "#3b82f6",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        boxShadow: "0 0 15px rgba(37,99,235,0.3)"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
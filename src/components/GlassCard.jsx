export default function GlassCard({ children, className = '', style = {}, onClick }) {
  return (
    <div
      className={`glass-card ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

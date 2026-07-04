/**
 * Inline alert for API-level errors and success confirmations.
 */
export default function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role="alert">
      {children}
    </div>
  );
}

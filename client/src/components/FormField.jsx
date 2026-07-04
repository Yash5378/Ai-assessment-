/**
 * Labeled input/textarea/select with an inline validation error slot.
 */
export default function FormField({ label, name, error, as = 'input', children, ...inputProps }) {
  const Element = as;
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <Element
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        className={error ? 'input input-error' : 'input'}
        {...inputProps}
      >
        {children}
      </Element>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

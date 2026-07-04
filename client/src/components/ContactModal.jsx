import { useEffect } from 'react';
import SkillChips from './SkillChips';
import { formatNoticePeriod, formatEmploymentStatus } from '../utils/format';

/**
 * Shows a candidate's full contact details for HR. Closes on Escape or when
 * the backdrop is clicked.
 */
export default function ContactModal({ candidate, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = [
    ['Email', candidate.email && <a href={`mailto:${candidate.email}`}>{candidate.email}</a>],
    [
      'Phone',
      candidate.phone && (
        <a href={`tel:${candidate.phone.replace(/\s/g, '')}`}>{candidate.phone}</a>
      ),
    ],
    ['Location', candidate.currentCity],
    [
      'Experience',
      `${candidate.experienceYears} yr${candidate.experienceYears === 1 ? '' : 's'} (${formatEmploymentStatus(candidate.employmentStatus)})`,
    ],
    ['Current company', candidate.currentCompany],
    ['Designation', candidate.currentDesignation],
    ['Current CTC', candidate.currentCtc != null ? `₹${candidate.currentCtc} LPA` : ''],
    ['Expected CTC', candidate.expectedCtc != null ? `₹${candidate.expectedCtc} LPA` : ''],
    ['Notice period', candidate.noticePeriod ? formatNoticePeriod(candidate.noticePeriod) : ''],
  ].filter(([, value]) => value);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Contact details for ${candidate.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{candidate.name}</h2>
            {candidate.headline && <p className="muted small">{candidate.headline}</p>}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <SkillChips skills={candidate.skills} />

        <dl className="contact-grid" style={{ marginTop: '0.9rem' }}>
          {rows.map(([label, value]) => (
            <div key={label} className="contact-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="modal-actions">
          {candidate.hasResume && (
            <a className="btn btn-secondary btn-sm" href={`/api/candidates/${candidate.id}/resume`}>
              Download resume
            </a>
          )}
          <a className="btn btn-primary btn-sm" href={`mailto:${candidate.email}`}>
            Email candidate
          </a>
        </div>
      </div>
    </div>
  );
}

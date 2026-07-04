import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import SkillChips from '../../components/SkillChips';
import ContactModal from '../../components/ContactModal';
import { formatNoticePeriod, formatEmploymentStatus } from '../../utils/format';
import { buildQuery } from '../../utils/query';

const EMPTY_FILTERS = { skills: '', location: '', minExperience: '', maxExperience: '' };

export default function FindCandidates() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [contact, setContact] = useState(null);

  const loadCandidates = useCallback(async (activeFilters) => {
    setSearching(true);
    setError('');
    try {
      const data = await api.get(`/candidates${buildQuery(activeFilters)}`);
      setCandidates(data.candidates);
      // Drop selections that are no longer in the result set.
      setSelected((prev) => {
        const ids = new Set(data.candidates.map((c) => c.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates(EMPTY_FILTERS);
  }, [loadCandidates]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    loadCandidates(filters);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    loadCandidates(EMPTY_FILTERS);
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = candidates?.length > 0 && selected.size === candidates.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  };

  // mailto: URLs have a practical length limit (~2000 chars), so bulk email
  // is capped rather than silently truncated.
  const MAX_EMAIL_RECIPIENTS = 40;

  // Opens the recruiter's mail client with every selected candidate on BCC,
  // so recipients don't see each other's addresses.
  const emailSelected = () => {
    if (!candidates) return;
    setActionMessage('');
    if (selected.size > MAX_EMAIL_RECIPIENTS) {
      setActionMessage(
        `Please select at most ${MAX_EMAIL_RECIPIENTS} candidates per email — mail clients reject longer recipient lists.`
      );
      return;
    }
    const emails = candidates
      .filter((c) => selected.has(c.id))
      .map((c) => c.email)
      .join(',');
    if (emails) window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}`;
  };

  const hasActiveFilters = Object.values(filters).some((value) => String(value).trim() !== '');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Find candidates</h1>
          <p className="muted">Search talent by skills, location and experience range</p>
        </div>
      </div>

      <form className="card filter-card" onSubmit={handleSearch}>
        <div className="filter-grid">
          <input
            className="input"
            name="skills"
            placeholder="Skills (e.g. react, sql)"
            value={filters.skills}
            onChange={handleChange}
          />
          <input
            className="input"
            name="location"
            placeholder="Location"
            value={filters.location}
            onChange={handleChange}
          />
          <input
            className="input"
            name="minExperience"
            type="number"
            min="0"
            max="50"
            placeholder="Min experience (yrs)"
            value={filters.minExperience}
            onChange={handleChange}
          />
          <input
            className="input"
            name="maxExperience"
            type="number"
            min="0"
            max="50"
            placeholder="Max experience (yrs)"
            value={filters.maxExperience}
            onChange={handleChange}
          />
        </div>
        <div className="card-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={searching}>
            {searching ? 'Searching…' : 'Search candidates'}
          </button>
          {hasActiveFilters && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleClear}>
              Clear filters
            </button>
          )}
        </div>
      </form>

      {error && <Alert>{error}</Alert>}
      {!candidates && !error && <div className="page-loader">Loading candidates…</div>}

      {candidates && (
        <>
          <Alert>{actionMessage}</Alert>
          <div className="results-bar">
            <label className="select-all">
              {candidates.length > 0 && (
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              )}
              <span className="muted">
                {candidates.length} candidate{candidates.length === 1 ? '' : 's'} found
                {selected.size > 0 ? ` · ${selected.size} selected` : ''}
              </span>
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={emailSelected}
              disabled={selected.size === 0}
            >
              Email selected ({selected.size})
            </button>
          </div>

          {candidates.length === 0 ? (
            <EmptyState
              title="No candidates match your search"
              hint="Candidates appear here once they publish a profile with their skills."
            />
          ) : (
            <div className="card-list">
              {candidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className={
                    selected.has(candidate.id)
                      ? 'card candidate-card selected'
                      : 'card candidate-card'
                  }
                >
                  <input
                    type="checkbox"
                    className="candidate-check"
                    checked={selected.has(candidate.id)}
                    onChange={() => toggleOne(candidate.id)}
                    aria-label={`Select ${candidate.name}`}
                  />
                  <div className="card-row candidate-body">
                    <div>
                      <h3>{candidate.name}</h3>
                      {candidate.headline && <p className="muted">{candidate.headline}</p>}
                      <p className="card-meta">
                        {candidate.currentCity && <span>{candidate.currentCity}</span>}
                        <span>
                          {candidate.experienceYears} yr{candidate.experienceYears === 1 ? '' : 's'}{' '}
                          · {formatEmploymentStatus(candidate.employmentStatus)}
                        </span>
                        {candidate.currentCompany && (
                          <span>
                            {candidate.currentDesignation
                              ? `${candidate.currentDesignation} @ ${candidate.currentCompany}`
                              : candidate.currentCompany}
                          </span>
                        )}
                        {candidate.expectedCtc != null && (
                          <span>Expects ₹{candidate.expectedCtc} LPA</span>
                        )}
                        {candidate.noticePeriod && (
                          <span>Notice: {formatNoticePeriod(candidate.noticePeriod)}</span>
                        )}
                      </p>
                      <SkillChips skills={candidate.skills} />
                    </div>
                    <div className="card-actions">
                      {candidate.hasResume && (
                        <a
                          className="btn btn-secondary btn-sm"
                          href={`/api/candidates/${candidate.id}/resume`}
                        >
                          Resume
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setContact(candidate)}
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {contact && <ContactModal candidate={contact} onClose={() => setContact(null)} />}
    </div>
  );
}

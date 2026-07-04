import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import SkillChips from '../../components/SkillChips';

const EMPTY_FILTERS = { skills: '', location: '', minExperience: '' };

const buildQuery = (filters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (String(value).trim() !== '') params.set(key, String(value).trim());
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export default function FindCandidates() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  const loadCandidates = useCallback(async (activeFilters) => {
    setSearching(true);
    setError('');
    try {
      const data = await api.get(`/candidates${buildQuery(activeFilters)}`);
      setCandidates(data.candidates);
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

  const hasActiveFilters = Object.values(filters).some((value) => String(value).trim() !== '');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Find candidates</h1>
          <p className="muted">Search talent by skills, location and experience</p>
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
          <p className="muted">
            {candidates.length} candidate{candidates.length === 1 ? '' : 's'} found
            {candidates.length === 0 ? '' : ' (only candidates with a published profile appear here)'}
          </p>
          {candidates.length === 0 ? (
            <EmptyState
              title="No candidates match your search"
              hint="Candidates appear here once they publish a profile with their skills."
            />
          ) : (
            <div className="card-list">
              {candidates.map((candidate) => (
                <article key={candidate.id} className="card">
                  <div className="card-row">
                    <div>
                      <h3>{candidate.name}</h3>
                      {candidate.headline && <p className="muted">{candidate.headline}</p>}
                      <p className="card-meta">
                        {candidate.location && <span>{candidate.location}</span>}
                        <span>
                          {candidate.experienceYears} yr{candidate.experienceYears === 1 ? '' : 's'} experience
                        </span>
                        {candidate.expectedSalary != null && (
                          <span>Expects ₹{candidate.expectedSalary} LPA</span>
                        )}
                      </p>
                      <SkillChips skills={candidate.skills} />
                    </div>
                    <div className="card-actions">
                      <a className="btn btn-secondary btn-sm" href={`mailto:${candidate.email}`}>
                        Contact
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

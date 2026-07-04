import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import SkillChips from '../../components/SkillChips';
import {
  formatEmploymentType,
  formatDate,
  formatSalary,
  formatExperience,
} from '../../utils/format';
import { buildQuery } from '../../utils/query';

const EMPTY_FILTERS = {
  title: '',
  company: '',
  location: '',
  skills: '',
  maxExperience: '',
  minSalary: '',
};

// The URL query string is the source of truth for active filters, so
// searches are shareable, bookmarkable and back-button friendly.
const filtersFromParams = (searchParams) => {
  const filters = { ...EMPTY_FILTERS };
  for (const key of Object.keys(EMPTY_FILTERS)) {
    filters[key] = searchParams.get(key) ?? '';
  }
  return filters;
};

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => filtersFromParams(searchParams));
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  const loadJobs = useCallback(async (activeFilters) => {
    setSearching(true);
    setError('');
    try {
      const data = await api.get(`/jobs${buildQuery(activeFilters)}`);
      setJobs(data.jobs);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }, []);

  // Runs on mount and whenever the URL changes (search, clear, back button).
  useEffect(() => {
    const active = filtersFromParams(searchParams);
    setFilters(active);
    loadJobs(active);
  }, [searchParams, loadJobs]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const params = {};
    for (const [key, value] of Object.entries(filters)) {
      if (String(value).trim() !== '') params[key] = String(value).trim();
    }
    setSearchParams(params); // the useEffect above performs the fetch
  };

  const handleClear = () => {
    setSearchParams({});
  };

  const hasActiveFilters = Object.values(filters).some((value) => String(value).trim() !== '');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Open positions</h1>
          <p className="muted">Search by role, skills, location, experience, salary or company</p>
        </div>
      </div>

      <form className="card filter-card" onSubmit={handleSearch}>
        <div className="filter-grid">
          <input
            className="input"
            name="title"
            placeholder="Role / title (e.g. frontend)"
            value={filters.title}
            onChange={handleFilterChange}
          />
          <input
            className="input"
            name="skills"
            placeholder="Skills (e.g. react, sql)"
            value={filters.skills}
            onChange={handleFilterChange}
          />
          <input
            className="input"
            name="location"
            placeholder="Location"
            value={filters.location}
            onChange={handleFilterChange}
          />
          <input
            className="input"
            name="company"
            placeholder="Company"
            value={filters.company}
            onChange={handleFilterChange}
          />
          <input
            className="input"
            name="maxExperience"
            type="number"
            min="0"
            max="50"
            placeholder="My experience (yrs)"
            value={filters.maxExperience}
            onChange={handleFilterChange}
          />
          <input
            className="input"
            name="minSalary"
            type="number"
            min="0"
            max="1000"
            placeholder="Min salary (₹ LPA)"
            value={filters.minSalary}
            onChange={handleFilterChange}
          />
        </div>
        <div className="card-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={searching}>
            {searching ? 'Searching…' : 'Search jobs'}
          </button>
          {hasActiveFilters && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleClear}>
              Clear filters
            </button>
          )}
        </div>
      </form>

      {error && <Alert>{error}</Alert>}
      {!jobs && !error && <div className="page-loader">Loading jobs…</div>}

      {jobs && (
        <>
          <p className="muted">
            {jobs.length} job{jobs.length === 1 ? '' : 's'} found
          </p>
          {jobs.length === 0 ? (
            <EmptyState title="No jobs match your search" hint="Try removing a filter or two." />
          ) : (
            <div className="card-list">
              {jobs.map((job) => (
                <article key={job.id} className="card">
                  <div className="card-row">
                    <div>
                      <h3>
                        <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                      </h3>
                      <p className="card-meta">
                        <span>{job.company}</span>
                        <span>{job.location}</span>
                        <span>{formatEmploymentType(job.employmentType)}</span>
                        <span>{formatExperience(job.experienceMin, job.experienceMax)}</span>
                        <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                        <span>Posted {formatDate(job.createdAt)}</span>
                      </p>
                      <SkillChips skills={job.skills} />
                    </div>
                    <div className="card-actions">
                      {job.hasApplied ? (
                        <span className="badge badge-submitted">Applied</span>
                      ) : (
                        <Link className="btn btn-primary btn-sm" to={`/jobs/${job.id}`}>
                          View & apply
                        </Link>
                      )}
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

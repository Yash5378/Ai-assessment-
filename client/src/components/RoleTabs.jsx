const ROLE_TABS = [
  { value: 'CANDIDATE', label: 'Candidate' },
  { value: 'HR', label: 'HR / Recruiter' },
];

/**
 * Two-way role switch used on the login and register pages.
 */
export default function RoleTabs({ value, onChange }) {
  return (
    <div className="role-tabs" role="tablist">
      {ROLE_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={value === tab.value ? 'role-tab active' : 'role-tab'}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

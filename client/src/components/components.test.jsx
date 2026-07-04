import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusBadge from './StatusBadge';
import RoleTabs from './RoleTabs';
import FormField from './FormField';
import SkillChips from './SkillChips';

describe('StatusBadge', () => {
  it('renders a friendly label with the status-specific class', () => {
    render(<StatusBadge status="UNDER_REVIEW" />);
    const badge = screen.getByText('Under review');
    expect(badge).toHaveClass('badge', 'badge-under_review');
  });

  it('falls back to the raw value for unknown statuses', () => {
    render(<StatusBadge status="SOMETHING_NEW" />);
    expect(screen.getByText('SOMETHING_NEW')).toBeInTheDocument();
  });
});

describe('RoleTabs', () => {
  it('marks the active tab and reports changes', async () => {
    const onChange = vi.fn();
    render(<RoleTabs value="CANDIDATE" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'Candidate' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('tab', { name: 'HR / Recruiter' }));
    expect(onChange).toHaveBeenCalledWith('HR');
  });
});

describe('FormField', () => {
  it('links the label to the input and shows no error by default', () => {
    render(<FormField label="Email" name="email" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('renders the error message and flags the input as invalid', () => {
    render(
      <FormField
        label="Email"
        name="email"
        value=""
        onChange={() => {}}
        error="Email is required"
      />
    );
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('SkillChips', () => {
  it('renders one chip per skill', () => {
    render(<SkillChips skills={['react', 'sql']} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('sql')).toBeInTheDocument();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<SkillChips skills={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

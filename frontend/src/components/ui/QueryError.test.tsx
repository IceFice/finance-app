import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryError } from './QueryError';

describe('QueryError', () => {
  it('renders an alert with the given message', () => {
    render(<QueryError message="Не удалось загрузить бюджеты" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Не удалось загрузить бюджеты');
  });

  it('shows a Retry button only when onRetry is provided and calls it', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<QueryError />);
    expect(screen.queryByRole('button', { name: /повторить/i })).not.toBeInTheDocument();

    rerender(<QueryError onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /повторить/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

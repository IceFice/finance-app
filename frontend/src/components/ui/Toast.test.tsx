import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast, extractApiError } from './Toast';

describe('extractApiError', () => {
  it('prefers the API error.message', () => {
    const err = { response: { data: { error: { message: 'Сумма должна быть больше нуля' } } } };
    expect(extractApiError(err)).toBe('Сумма должна быть больше нуля');
  });

  it('maps known status codes when no message', () => {
    expect(extractApiError({ response: { status: 401 } })).toMatch(/авторизац/i);
    expect(extractApiError({ response: { status: 403 } })).toMatch(/запрещ/i);
    expect(extractApiError({ response: { status: 404 } })).toMatch(/не найден/i);
    expect(extractApiError({ response: { status: 429 } })).toMatch(/много запросов/i);
    expect(extractApiError({ response: { status: 503 } })).toMatch(/сервера/i);
  });

  it('falls back for plain Error and unknown', () => {
    expect(extractApiError(new Error('boom'))).toBe('boom');
    expect(extractApiError(null)).toMatch(/неизвестная ошибка/i);
  });
});

function Trigger() {
  const { showError } = useToast();
  return <button onClick={() => showError('Ошибка загрузки')}>fail</button>;
}

describe('ToastProvider', () => {
  it('renders a toast when showError is called', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    expect(screen.queryByText('Ошибка загрузки')).not.toBeInTheDocument();
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'fail' }));
    });
    expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
  });
});

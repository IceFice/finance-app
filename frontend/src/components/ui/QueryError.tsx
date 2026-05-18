import { Card } from './Card';
import { Button } from './Button';

interface QueryErrorProps {
  /** Short, user-facing description of what failed to load. */
  message?: string;
  onRetry?: () => void;
  /** Render inside a Card (default) or bare (for use inside an existing card). */
  bare?: boolean;
}

/**
 * Consistent "this data failed to load" state with a retry action.
 * Replaces silent empty screens / forever-skeletons when a query errors.
 */
export function QueryError({
  message = 'Не удалось загрузить данные',
  onRetry,
  bare = false,
}: QueryErrorProps) {
  const body = (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-14 text-center text-gray-500 dark:text-gray-400"
    >
      <span className="text-4xl mb-3" aria-hidden="true">⚠️</span>
      <p className="font-medium text-gray-700 dark:text-gray-300">{message}</p>
      <p className="text-sm mt-1">Проверьте соединение и попробуйте снова</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
  return bare ? body : <Card className="p-0">{body}</Card>;
}

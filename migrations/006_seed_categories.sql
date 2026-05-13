-- System categories (user_id IS NULL, is_system = true)
INSERT INTO categories (name, type, icon, color, is_system, sort_order) VALUES
-- Income
('Зарплата',        'income',  '💼', '#22C55E', true, 1),
('Фриланс',         'income',  '💻', '#16A34A', true, 2),
('Инвестиции',      'income',  '📈', '#15803D', true, 3),
('Подарки',         'income',  '🎁', '#4ADE80', true, 4),
('Прочие доходы',   'income',  '💰', '#86EFAC', true, 5),
-- Expense
('Жильё',           'expense', '🏠', '#EF4444', true, 10),
('Еда и продукты',  'expense', '🛒', '#F97316', true, 11),
('Транспорт',       'expense', '🚗', '#EAB308', true, 12),
('Здоровье',        'expense', '💊', '#EC4899', true, 13),
('Развлечения',     'expense', '🎬', '#8B5CF6', true, 14),
('Одежда',          'expense', '👕', '#06B6D4', true, 15),
('Образование',     'expense', '📚', '#3B82F6', true, 16),
('Связь',           'expense', '📱', '#6366F1', true, 17),
('Рестораны',       'expense', '🍽️', '#F43F5E', true, 18),
('Путешествия',     'expense', '✈️', '#14B8A6', true, 19),
('Спорт',           'expense', '🏋️', '#84CC16', true, 20),
('Подписки',        'expense', '📺', '#A855F7', true, 21),
('Прочие расходы',  'expense', '💸', '#9CA3AF', true, 99)
ON CONFLICT DO NOTHING;

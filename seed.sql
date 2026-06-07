-- Active: 1780687043970@@127.0.0.1@5433@book_notes
-- ==========================================
-- 1. SEED DUMMY BOOKS (Parent Records)
-- ==========================================
INSERT INTO books (title, author, isbn) VALUES
('Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', '9780062316097'),
('Atomic Habits', 'James Clear', '9780735211292'),
('Deep Work', 'Cal Newport', '9781455586691');

-- ==========================================
-- 2. SEED ASSOCIATED REVIEWS (Child Records)
-- ==========================================
-- Instead of guessing IDs, each query selects the generated 'id' using the unique ISBN.
INSERT INTO reviews (book_id, rating, notes, date_read) VALUES
(
    (SELECT id FROM books WHERE isbn = '9780062316097'),
    5,
    'An absolutely mind-expanding look at how human social cooperation and conceptual myths shaped our history. Highly recommended for understanding modern civilization structural networks.',
    '2026-03-15'
),
(
    (SELECT id FROM books WHERE isbn = '9780735211292'),
    5,
    'Outstanding, actionable playbook for systemizing habits. The absolute focus on identity-based patterns over sheer outcome-driven goals is a highly effective paradigm shift.',
    '2026-04-20'
),
(
    (SELECT id FROM books WHERE isbn = '9781455586691'),
    4,
    'A solid, structured critique of modern cognitive distractions. Provides actionable guidelines for establishing deep, uninterrupted focus blocks in a fragmented professional landscape.',
    '2026-05-10'
);
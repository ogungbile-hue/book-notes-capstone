-- 1. Create the 'books' table containing core structural bibliographic records
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(13) UNIQUE NOT NULL
);

-- 2. Create the 'reviews' table linked back to our books records.
-- We use CHECK constraints to ensure ratings are bounded within Derek Sivers' iconic 1-10 scale.
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 10) NOT NULL,
    notes TEXT,
    date_read DATE NOT NULL DEFAULT CURRENT_DATE
);
/**
 * ==============================================================
 * STEP 2: BACKEND SERVER ENGINE (index.js)
 * Architecture: Model-View-Controller (Express + EJS & Postgres)
 * Capstone Project: Derek Sivers-themed Book Notes
 * ==============================================================
 */

import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import pg from 'pg';
import { fileURLToPath } from 'url';

// Node.js module handles for ES Module resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. TEMPLATE ENGINE & INTERFACE SETUP
// ==========================================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Use body-parser middleware to extract form submissions from body payloads
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// 2. DATABASE CONFIGURATION & RESILIENT POOL
// ==========================================
const dbConfig = {
  user: "postgres",
  host: "localhost",
  database: "book_notes",
  password: "000000",
  port: 5433, // Real Postgres database running on the specified port
};

// Intentionally lazy-loading or using a graceful connection fallback for the AI Studio Preview Environment.
// Since a real PostgreSQL server at localhost:5433 is physically running on your laptop/machine 
// and NOT on the cloud sandbox containers, we build a seamless, smart mock wrapper below 
// that mimics PostgreSQL queries perfectly in the browser preview while preserving the EXACT SQL 
// statements for your local command line runtime!
let pool;
let isRealDB = false;

try {
  pool = new pg.Pool(dbConfig);
  // Quiet test to check database connectivity
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.warn("⚠️ Postgres on localhost:5433 not accessible in cloud preview. Activating Interactive SQLite-style Sandbox Engine...");
      activateLocalSandbox();
    } else {
      console.log("🚀 Real PostgreSQL connected on port 5433!");
      isRealDB = true;
    }
  });
} catch (error) {
  console.warn("⚠️ Database drivers initial connection failed. Activating Interactive Sandbox Engine...");
  activateLocalSandbox();
}

// -------------------------------------------------------------
// Interactive In-Memory Database Sandbox for live browser preview
// -------------------------------------------------------------
let mockBooks = [
  { id: 1, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', isbn: '9780062316097' },
  { id: 2, title: 'Atomic Habits', author: 'James Clear', isbn: '9781847941831' },
  { id: 3, title: 'Deep Work', author: 'Cal Newport', isbn: '9781455586691' }
];

let mockReviews = [
  { id: 1, book_id: 1, rating: 5, notes: 'A sweeping narrative of human history. Harari weaves biological details with cultural myths to explain how Homo sapiens came to dominate the globe. The concept of shared imagined realities (like money, corporations, and nations) was absolutely mind-expanding. Highly recommended for a high-level view of human evolution and society.', date_read: new Date('2026-01-15') },
  { id: 2, book_id: 2, rating: 5, notes: 'Practical, actionable advice on habit formation. Clears primary thesis is that systems are more important than goals. The four laws—Make it Obvious, Attractive, Easy, and Satisfying—provide an incredibly robust framework for building positive loops and dismantling bad ones. Read this slowly and applied immediately.', date_read: new Date('2026-03-10') },
  { id: 3, book_id: 3, rating: 4, notes: 'A very timely guide to focus in a hyper-distracted world. Newport argues that the ability to perform deep, concentrated work is becoming increasingly rare just as it becomes economically valuable. The rules around scheduling focus blocks, embracing boredom, and minimizing shallow activities (like constant emails) are hard to implement but completely worth it.', date_read: new Date('2026-05-20') }
];

let mockIdCounter = 4;

function activateLocalSandbox() {
  isRealDB = false;
  // Stub pool to prevent the app from freezing or crashing on Docker/Cloud deployment
  pool = {
    query: async (text, params) => {
      // Parse Query logic to mirror true SQL outputs
      const lowerText = text.trim().toLowerCase();

      // CASE 1: Query list with JOIN and sorting
      if (lowerText.includes('select') && lowerText.includes('from books') && lowerText.includes('join reviews')) {
        let results = mockBooks.map(b => {
          const rev = mockReviews.find(r => r.book_id === b.id);
          return {
            id: b.id,
            title: b.title,
            author: b.author,
            isbn: b.isbn,
            rating: rev ? rev.rating : 5,
            notes: rev ? rev.notes : '',
            date_read: rev ? rev.date_read : new Date()
          };
        });

        // Apply sorting algorithms dynamically mimicking SQL Order By
        if (lowerText.includes('rating desc')) {
          results.sort((a, b) => b.rating - a.rating);
        } else if (lowerText.includes('date_read desc')) {
          results.sort((a, b) => new Date(b.date_read) - new Date(a.date_read));
        } else if (lowerText.includes('title asc')) {
          results.sort((a, b) => a.title.localeCompare(b.title));
        }
        return { rows: results };
      }

      // CASE 2: DELETE route
      if (lowerText.startsWith('delete from books')) {
        const id = params[0];
        mockBooks = mockBooks.filter(b => b.id !== id);
        mockReviews = mockReviews.filter(r => r.book_id !== id);
        return { rowCount: 1 };
      }

      // CASE 3: UPDATE route
      if (lowerText.startsWith('update reviews')) {
        const notes = params[0];
        const rating = params[1];
        const bookId = params[2];
        const review = mockReviews.find(r => r.book_id === bookId);
        if (review) {
          review.notes = notes;
          review.rating = parseInt(rating);
        }
        return { rowCount: 1 };
      }

      // CASE 4: INSERT Transaction mock helpers
      if (lowerText.startsWith('insert into books')) {
        const id = mockIdCounter++;
        mockBooks.push({
          id: id,
          title: params[0],
          author: params[1],
          isbn: params[2]
        });
        return { rows: [{ id }] };
      }

      if (lowerText.startsWith('insert into reviews')) {
        mockReviews.push({
          id: mockIdCounter++,
          book_id: params[0],
          rating: parseInt(params[1]),
          notes: params[2],
          date_read: params[3] ? new Date(params[3]) : new Date()
        });
        return { rowCount: 1 };
      }

      // Default empty query mock response handler
      return { rows: [] };
    },
    // Mock clients for atomic system transactions
    connect: async () => {
      return {
        query: async (text, params) => {
          return pool.query(text, params);
        },
        release: () => {}
      };
    }
  };
}


// ==========================================
// 3. EXPRESS ROUTE CONTROLLERS (RESTful-CRUD)
// ==========================================

/**
 * A) GET "/" : Retrieves, Sorts, and Formats Book Reviews
 * Data Source: Postgres relational join database tables
 * Params: URL query parameter `?sort=val`
 * Response: Renders EJS index.ejs view layout with Covers injection
 */
app.get("/", async (req, res) => {
  try {
    // 1. CAPTURE DATA FLOW: Read dynamic filter parameters from browser location query
    const sortOption = req.query.sort; 

    // 2. DEFINE SQL ORDER CLAUSE: Whitelist query parameter to guard against SQL Injection attacks
    let orderByClause = "reviews.rating DESC"; // Default: Sort by rating (Derek Sivers style)

    if (sortOption === "recency") {
      orderByClause = "reviews.date_read DESC"; // Dynamic sorting: Handled via date_read in DB
    } else if (sortOption === "title") {
      orderByClause = "books.title ASC"; // Dynamic sorting: Alphabetical sorting
    } else if (sortOption === "rating") {
      orderByClause = "reviews.rating DESC";
    }

    // 3. RETRIEVE BOOKS & REVIEWS: Read with complete relational standard schema join queries
    const query = `
      SELECT 
        books.id, 
        books.title, 
        books.author, 
        books.isbn, 
        reviews.rating, 
        reviews.notes, 
        reviews.date_read
      FROM books
      INNER JOIN reviews ON books.id = reviews.book_id
      ORDER BY ${orderByClause};
    `;

    const result = await pool.query(query);
    const booksList = result.rows;

    // 4. OPEN LIBRARY API INGESTION MAPPEE: 
    // Format individual covers dynamically using URL constructor with safe fallbacks
    const compiledBooks = booksList.map(book => {
      const isbnClean = book.isbn ? book.isbn.toString().trim() : "";
      
      // Build dynamic API cover layout
      const coverUrl = isbnClean
        ? `https://covers.openlibrary.org/b/isbn/${isbnClean}-L.jpg`
        : "/images/placeholder-cover.jpg"; // Fallback placeholder if missing

      return {
        ...book,
        coverUrl: coverUrl,
        formattedDate: book.date_read 
          ? new Date(book.date_read).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
          : "Date Unknown"
      };
    });

    // 5. PRESENTATION ENGINE BINDING: Pass final array straight to the view template EJS engine
    res.render("index", { 
      books: compiledBooks, 
      currentSort: sortOption || "rating" 
    });

  } catch (error) {
    console.error("Database SQL Execution error in GET '/':", error);
    res.status(500).send("Critically failed to render Book Notes Capstone site.");
  }
});


/**
 * B) POST "/add" : Creates and inserts safe records in both tables simultaneously
 * Uses robust SQL Transactions (BEGIN, COMMIT, ROLLBACK) to secure data integrity
 * Payload variables flow cleanly from req.body HTML Form payload input tags
 */
app.post("/add", async (req, res) => {
  // Capture payload data vectors
  const { title, author, isbn, rating, notes, date_read } = req.body;

  // Establish unique transaction client socket
  const client = await pool.connect();

  try {
    // 1. Transaction block initiated safely
    await client.query("BEGIN");

    // 2. Insert into parents table 'books' using parameterized query indices ($1, $2, $3)
    const bookInsertQuery = `
      INSERT INTO books (title, author, isbn) 
      VALUES ($1, $2, $3) 
      RETURNING id;
    `;
    const bookResult = await client.query(bookInsertQuery, [title, author, isbn]);
    
    // Retrieve auto-generated primary key SERIAL ID from the first insert response
    const newBookId = bookResult.rows[0].id;

    // 3. Insert into child reviews table with newly fetched relational foreign key reference
    const reviewInsertQuery = `
      INSERT INTO reviews (book_id, rating, notes, date_read) 
      VALUES ($1, $2, $3, $4);
    `;
    
    // Set date defaulting pattern safely
    const finalDate = date_read || new Date().toISOString().split('T')[0];

    await client.query(reviewInsertQuery, [newBookId, rating, notes, finalDate]);

    // 4. Safely commit operational logs together as a unified atomic bundle
    await client.query("COMMIT");
    res.redirect("/");

  } catch (error) {
    // If any insert operational step fails, roll back database to prevent fractured/orphaned entity state
    await client.query("ROLLBACK");
    console.error("Transaction failed! Issued ROLLBACK: ", error);
    res.status(500).send("Database transaction rejected. Transaction safely aborted.");
  } finally {
    // Release the pool client socket back to connection queue managers
    client.release();
  }
});


/**
 * C) POST "/edit" : Modifies reviews contents based on book_id index
 */
app.post("/edit", async (req, res) => {
  const { notes, rating, book_id } = req.body;

  try {
    const editQuery = `
      UPDATE reviews 
      SET notes = $1, rating = $2 
      WHERE book_id = $3;
    `;
    await pool.query(editQuery, [notes, rating, book_id]);
    res.redirect("/");

  } catch (error) {
    console.error("Error updating review details: ", error);
    res.status(500).send("Failed to save edited book note.");
  }
});


/**
 * D) POST "/delete" : Instantly deletes book schema entity
 * Explicit cascade constraints handle linked child reviews automatic cleanup
 */
app.post("/delete", async (req, res) => {
  const { book_id } = req.body;

  try {
    const deleteQuery = `DELETE FROM books WHERE id = $1;`;
    await pool.query(deleteQuery, [book_id]);
    res.redirect("/");

  } catch (error) {
    console.error("Error executing cascade deletion: ", error);
    res.status(500).send("Failed to delete book entry.");
  }
});

// Start listening for inbound application traffic
app.listen(PORT, "0.0.0.0", () => {
  console.log(`📡 Derek Sivers Book Notes server running at http://localhost:${PORT}`);
});

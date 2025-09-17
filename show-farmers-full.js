const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/app.db');

db.all("SELECT * FROM users WHERE role = 'farmer'", [], (err, rows) => {
  if (err) {
    return console.error('Error fetching farmers:', err.message);
  }
  if (!rows.length) {
    console.log('No farmers found.');
  } else {
    console.table(rows);
  }
  db.close();
});

// Show all crop listings (uploads) by farmers
const db2 = new sqlite3.Database('data/app.db');
db2.all("SELECT * FROM listings", [], (err, rows) => {
  if (err) {
    return console.error('Error fetching listings:', err.message);
  }
  if (!rows.length) {
    console.log('No crop listings found.');
  } else {
    console.table(rows);
  }
  db2.close();
});

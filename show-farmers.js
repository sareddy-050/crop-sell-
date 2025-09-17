const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/app.db');

db.all("SELECT id, admin_name, email, phone, role, created_at FROM users WHERE role = 'farmer'", [], (err, rows) => {
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

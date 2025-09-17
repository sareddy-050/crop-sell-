const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/app.db');

db.all("SELECT id, role, email, phone, admin_name, created_at FROM users WHERE role = 'customer'", [], (err, rows) => {
  if (err) {
    console.error('Error fetching customers:', err.message);
    db.close();
    return;
  }
  if (!rows.length) {
    console.log('No customers found.');
  } else {
    console.table(rows);
  }
  db.close();
});

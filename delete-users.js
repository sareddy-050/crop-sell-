const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/app.db');

db.run("DELETE FROM users WHERE role = 'farmer' OR role = 'customer'", function(err) {
  if (err) {
    return console.error('Error deleting users:', err.message);
  }
  console.log(`Deleted ${this.changes} users with role 'farmer' or 'customer'.`);
  db.close();
});
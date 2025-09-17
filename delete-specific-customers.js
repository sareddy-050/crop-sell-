const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/app.db');
const authRouter = require('./src/routes/auth');

// Add customer emails or admin_names to delete here
const emailsToDelete = ['amar@local'];
const adminNamesToDelete = ['amar'];

function deleteCustomers() {
  const emailPlaceholders = emailsToDelete.map(() => '?').join(',');
  const adminPlaceholders = adminNamesToDelete.map(() => '?').join(',');
  let sql = `DELETE FROM users WHERE role = 'customer'`;
  let params = [];
  if (emailsToDelete.length) {
    sql += ` AND (email IN (${emailPlaceholders})`;
    params = params.concat(emailsToDelete);
    if (adminNamesToDelete.length) {
      sql += ` OR admin_name IN (${adminPlaceholders})`;
      params = params.concat(adminNamesToDelete);
    }
    sql += ')';
  } else if (adminNamesToDelete.length) {
    sql += ` AND admin_name IN (${adminPlaceholders})`;
    params = params.concat(adminNamesToDelete);
  }
  db.run(sql, params, function(err) {
    if (err) {
      return console.error('Error deleting customers:', err.message);
    }
    console.log(`Deleted ${this.changes} customer(s) from the database.`);
    db.close();
  });
}

deleteCustomers();
app.use('/api/auth', authRouter);

exports.router = router;

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/app.db');

const emailsToDelete = ['ramesh@local', 'ramesh@gmail.com', 'farmer1']; // Add 'farmer1' as email
const adminNamesToDelete = ['Ramesh', 'ramesh', 'farmer1']; // Add 'farmer1' as admin_name
const farmerEmailsInListings = ['farmer1']; // Direct match in listings
const farmerNamesInListings = ['Ramesh']; // Direct match in listings

// Step 1: Find all emails for farmers with admin_name or email matching
function getFarmerEmails(callback) {
  db.all(
    "SELECT email FROM users WHERE (" +
      emailsToDelete.map(() => "email = ?").join(" OR ") +
      (adminNamesToDelete.length ? " OR " + adminNamesToDelete.map(() => "admin_name = ?").join(" OR ") : "") +
      ") AND role = 'farmer'",
    [...emailsToDelete, ...adminNamesToDelete],
    function(err, rows) {
      if (err) {
        console.error('Error finding farmer emails:', err.message);
        db.close();
        return;
      }
      const allEmails = rows.map(r => r.email).concat(farmerEmailsInListings);
      callback(allEmails);
    }
  );
}

function deleteListingsForEmails(emails, cb) {
  // Also delete by farmer_name
  const emailPlaceholders = emails.map(() => '?').join(',');
  const namePlaceholders = farmerNamesInListings.map(() => '?').join(',');
  let sql = `DELETE FROM listings WHERE 1=0`;
  let params = [];
  if (emails.length) {
    sql += ` OR farmer_email IN (${emailPlaceholders})`;
    params = params.concat(emails);
  }
  if (farmerNamesInListings.length) {
    sql += ` OR farmer_name IN (${namePlaceholders})`;
    params = params.concat(farmerNamesInListings);
  }
  db.run(sql, params, function(err) {
    if (err) {
      return console.error('Error deleting listings:', err.message);
    }
    console.log(`Deleted ${this.changes} crop listing(s) for the specified farmers.`);
    cb();
  });
}

function deleteFarmers(emails) {
  const emailPlaceholders = emails.map(() => '?').join(',');
  const adminPlaceholders = adminNamesToDelete.map(() => '?').join(',');
  let sql = `DELETE FROM users WHERE role = 'farmer'`;
  let params = [];
  if (emails.length) {
    sql += ` AND (email IN (${emailPlaceholders})`;
    params = params.concat(emails);
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
      return console.error('Error deleting farmers:', err.message);
    }
    console.log(`Deleted ${this.changes} farmer(s) from the database.`);
    db.close();
  });
}

getFarmerEmails(function(emails) {
  deleteListingsForEmails(emails, function() {
    deleteFarmers(emails);
  });
});

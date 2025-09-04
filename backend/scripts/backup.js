const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

const backupDatabase = () => {
  const date = new Date().toISOString().split('T')[0];
  const backupFile = path.join(backupsDir, `backup-${date}.sql`);
  
  // This is a simple backup using pg_dump
  // You'll need to adjust the connection string for your setup
  const command = `pg_dump ${process.env.DATABASE_URL} > ${backupFile}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Backup failed:', error);
    } else {
      console.log(`Backup completed: ${backupFile}`);
      
      // Optional: Delete backups older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      fs.readdirSync(backupsDir).forEach(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < thirtyDaysAgo && file.startsWith('backup-')) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old backup: ${file}`);
        }
      });
    }
  });
};

// Manual backup function
module.exports = { backupDatabase };

// Run backup if this script is called directly
if (require.main === module) {
  backupDatabase();
}
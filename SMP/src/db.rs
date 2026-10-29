use rocket::fairing::AdHoc;
use rocket_db_pools::{sqlx, Database};

#[derive(Database)]
#[database("pigeon_db")]
pub struct PigeonDb(sqlx::SqlitePool);

impl PigeonDb {
    pub fn migrate() -> AdHoc {
        use rocket::fairing::AdHoc;

        AdHoc::on_ignite("SQLx Migrations", |rocket| async move {
            let db = PigeonDb::fetch(&rocket).unwrap();

            sqlx::query(
                "CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT,
                    bio TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
            )
            .execute(&**db)
            .await
            .expect("Failed to create users table");

            sqlx::query(
                "CREATE TABLE IF NOT EXISTS pigeons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    color TEXT NOT NULL,
                    age INTEGER NOT NULL,
                    description TEXT NOT NULL,
                    owner_username TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE
                )",
            )
            .execute(&**db)
            .await
            .expect("Failed to create pigeons table");

            sqlx::query(
                "CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY NOT NULL,
                    pigeon_id INTEGER NOT NULL,
                    sender_username TEXT NOT NULL,
                    recipient_username TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (pigeon_id) REFERENCES pigeons(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_username) REFERENCES users(username) ON DELETE CASCADE
                )",
            )
            .execute(&**db)
            .await
            .expect("Failed to create messages table");

            rocket
        })
    }
}

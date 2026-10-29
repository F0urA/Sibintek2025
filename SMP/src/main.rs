#[macro_use]
extern crate rocket;

mod api;
mod auth;
mod db;
mod models;

use db::PigeonDb;
use rocket::fs::{relative, FileServer};
use rocket_db_pools::Database;

#[catch(500)]
fn internal_error() -> &'static str {
    "Whoops! Looks like we messed up."
}

#[get("/health")]
fn health() -> &'static str {
    "OK"
}

#[launch]
async fn rocket() -> _ {
    auth::init();
    rocket::build()
        .attach(PigeonDb::init())
        .attach(PigeonDb::migrate())
        .register("/", catchers![internal_error])
        .mount("/", routes![health])
        .mount("/", FileServer::from(relative!("static")))
        .mount("/api", api::routes())
}

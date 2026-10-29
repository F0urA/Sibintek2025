use crate::auth::AuthToken;
use crate::db::PigeonDb;
use crate::models::{ColorStat, Statistics, UserProfile, UserUpdateRequest};
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket_db_pools::Connection;

#[get("/profile")]
async fn get_profile(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
) -> Result<Json<UserProfile>, Status> {
    let user: Option<(String, Option<String>, Option<String>)> =
        sqlx::query_as("SELECT username, email, bio FROM users WHERE username = ?")
            .bind(&auth.username)
            .fetch_optional(&mut **db)
            .await
            .map_err(|_| Status::InternalServerError)?;

    let user = user.ok_or(Status::NotFound)?;

    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM pigeons WHERE owner_username = ?")
        .bind(&auth.username)
        .fetch_one(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(UserProfile {
        username: user.0,
        email: user.1,
        bio: user.2,
        pigeons_count: count.0,
    }))
}

#[put("/profile", data = "<profile_data>")]
async fn update_profile(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
    profile_data: Json<UserUpdateRequest>,
) -> Result<Json<UserProfile>, Status> {
    if let Some(email) = &profile_data.email {
        sqlx::query("UPDATE users SET email = ? WHERE username = ?")
            .bind(email)
            .bind(&auth.username)
            .execute(&mut **db)
            .await
            .map_err(|_| Status::InternalServerError)?;
    }

    if let Some(bio) = &profile_data.bio {
        sqlx::query("UPDATE users SET bio = ? WHERE username = ?")
            .bind(bio)
            .bind(&auth.username)
            .execute(&mut **db)
            .await
            .map_err(|_| Status::InternalServerError)?;
    }

    get_profile(db, auth).await
}

#[get("/statistics")]
async fn get_statistics(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
) -> Result<Json<Statistics>, Status> {
    let total_pigeons: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM pigeons WHERE owner_username = ?")
            .bind(&auth.username)
            .fetch_one(&mut **db)
            .await
            .map_err(|_| Status::InternalServerError)?;

    let average_age: (Option<f64>,) =
        sqlx::query_as("SELECT AVG(age) FROM pigeons WHERE owner_username = ?")
            .bind(&auth.username)
            .fetch_one(&mut **db)
            .await
            .map_err(|_| Status::InternalServerError)?;

    let total_users: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let colors: Vec<(String, i64)> = sqlx::query_as(
        "SELECT color, COUNT(*) as count FROM pigeons WHERE owner_username = ? GROUP BY color ORDER BY count DESC",
    )
        .bind(&auth.username)
        .fetch_all(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let colors_distribution = colors
        .into_iter()
        .map(|(color, count)| ColorStat { color, count })
        .collect();

    Ok(Json(Statistics {
        total_pigeons: total_pigeons.0,
        average_age: average_age.0.unwrap_or(0.0),
        total_users: total_users.0,
        colors_distribution,
    }))
}

pub(crate) fn routes() -> Vec<rocket::Route> {
    routes![get_profile, update_profile, get_statistics]
}

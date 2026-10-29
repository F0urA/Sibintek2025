use crate::auth::generate_token;
use crate::db::PigeonDb;
use crate::models::{LoginRequest, LoginResponse, RegisterRequest, User};
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket_db_pools::Connection;

#[post("/register", data = "<user_data>")]
async fn register(
    mut db: Connection<PigeonDb>,
    user_data: Json<RegisterRequest>,
) -> Result<Json<LoginResponse>, Status> {
    let hashed_password = bcrypt::hash(&user_data.password, bcrypt::DEFAULT_COST)
        .map_err(|_| Status::InternalServerError)?;

    let result = sqlx::query("INSERT INTO users (username, password) VALUES (?, ?)")
        .bind(&user_data.username)
        .bind(&hashed_password)
        .execute(&mut **db)
        .await;

    match result {
        Ok(_) => {
            let token =
                generate_token(&user_data.username).map_err(|_| Status::InternalServerError)?;
            Ok(Json(LoginResponse { token }))
        }
        Err(_) => Err(Status::Conflict),
    }
}

#[post("/login", data = "<login_data>")]
async fn login(
    mut db: Connection<PigeonDb>,
    login_data: Json<LoginRequest>,
) -> Result<Json<LoginResponse>, Status> {
    let user: Option<User> =
        sqlx::query_as("SELECT id, username, password FROM users WHERE username = ?")
            .bind(&login_data.username)
            .fetch_optional(&mut **db)
            .await
            .map_err(|_| Status::InternalServerError)?;

    match user {
        Some(user) => {
            if bcrypt::verify(&login_data.password, &user.password)
                .map_err(|_| Status::InternalServerError)?
            {
                let token =
                    generate_token(&user.username).map_err(|_| Status::InternalServerError)?;
                Ok(Json(LoginResponse { token }))
            } else {
                Err(Status::Unauthorized)
            }
        }
        None => Err(Status::Unauthorized),
    }
}

pub(crate) fn routes() -> Vec<rocket::Route> {
    routes![register, login]
}

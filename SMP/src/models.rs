use serde::{Deserialize, Serialize};
use sqlx::{FromRow};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Pigeon {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub age: i32,
    pub description: String,
    pub owner_username: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct PigeonRequest {
    pub name: String,
    pub color: String,
    pub age: i32,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
pub struct PigeonUpdateRequest {
    pub name: Option<String>,
    pub color: Option<String>,
    pub age: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UserUpdateRequest {
    pub email: Option<String>,
    pub bio: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserProfile {
    pub username: String,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub pigeons_count: i64,
}

#[derive(Debug, Serialize)]
pub struct Statistics {
    pub total_pigeons: i64,
    pub average_age: f64,
    pub total_users: i64,
    pub colors_distribution: Vec<ColorStat>,
}

#[derive(Debug, Serialize)]
pub struct ColorStat {
    pub color: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct PigeonSearchResult {
    pub pigeons: Vec<Pigeon>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: String,
    pub pigeon_id: i64,
    pub sender_username: String,
    pub recipient_username: String,
    pub subject: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct MessageRequest {
    pub pigeon_id: i64,
    pub recipient_username: String,
    pub subject: String,
    pub content: String,
}

#[derive(Debug, Deserialize, FromForm)]
pub struct GetMessageRequest {
    pub message_id: String,
}
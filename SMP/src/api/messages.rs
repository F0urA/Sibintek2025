use crate::auth::AuthToken;
use crate::db::PigeonDb;
use crate::models::{GetMessageRequest, Message, MessageRequest};
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket_db_pools::Connection;
use uuid::Uuid;

#[post("/messages", data = "<message_data>")]
async fn send_message(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
    message_data: Json<MessageRequest>,
) -> Result<Json<Message>, Status> {
    let pigeon_check: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM pigeons WHERE id = ? AND owner_username = ?"
    )
        .bind(message_data.pigeon_id)
        .bind(&auth.username)
        .fetch_optional(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    if pigeon_check.is_none() {
        return Err(Status::Forbidden);
    }

    let message_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO messages (id, pigeon_id, sender_username, recipient_username, subject, content)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
        .bind(&message_id)
        .bind(message_data.pigeon_id)
        .bind(&auth.username)
        .bind(&message_data.recipient_username)
        .bind(&message_data.subject)
        .bind(&message_data.content)
        .execute(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let message: Message = sqlx::query_as(
        "SELECT id, pigeon_id, sender_username, recipient_username, subject, content, created_at
         FROM messages WHERE id = ?"
    )
        .bind(&message_id)
        .fetch_one(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    Ok(Json(message))
}

#[get("/messages?<message_data..>")]
async fn get_message(
    mut db: Connection<PigeonDb>,
    message_data: GetMessageRequest,
) -> Result<Json<Vec<Message>>, Status> {

    let message: Vec<Message> = sqlx::query_as(
        "SELECT id, pigeon_id, sender_username, recipient_username, subject, content, created_at
         FROM messages WHERE id LIKE ?"
    )
        .bind(&message_data.message_id)
        .fetch_all(&mut **db)
        .await
        .map_err(|_| Status::NotFound)?;

    Ok(Json(message))
}

pub(crate) fn routes() -> Vec<rocket::Route> {
    routes![send_message, get_message]
}


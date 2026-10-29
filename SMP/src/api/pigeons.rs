use crate::auth::AuthToken;
use crate::db::PigeonDb;
use crate::models::{Pigeon, PigeonRequest, PigeonSearchResult, PigeonUpdateRequest};
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket_db_pools::Connection;

#[get("/pigeons")]
async fn get_pigeons(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
) -> Result<Json<Vec<Pigeon>>, Status> {
    let pigeons: Vec<Pigeon> =
        sqlx::query_as("SELECT id, name, color, age, description, owner_username FROM pigeons WHERE owner_username = ?")
            .bind(&auth.username)
            .fetch_all(&mut **db)
            .await
            .map_err(|_| Status::InternalServerError)?;

    Ok(Json(pigeons))
}

#[post("/pigeons", data = "<pigeon_data>")]
async fn create_pigeon(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
    pigeon_data: Json<PigeonRequest>,
) -> Result<Json<Pigeon>, Status> {
    let result = sqlx::query(
        "INSERT INTO pigeons (name, color, age, description, owner_username) VALUES (?, ?, ?, ?, ?)"
    )
        .bind(&pigeon_data.name)
        .bind(&pigeon_data.color)
        .bind(pigeon_data.age)
        .bind(&pigeon_data.description)
        .bind(&auth.username)
        .execute(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let pigeon = Pigeon {
        id: result.last_insert_rowid(),
        name: pigeon_data.name.clone(),
        color: pigeon_data.color.clone(),
        age: pigeon_data.age,
        description: pigeon_data.description.clone(),
        owner_username: auth.username.clone(),
    };

    Ok(Json(pigeon))
}

#[delete("/pigeons/<id>")]
async fn delete_pigeon(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
    id: i64,
) -> Result<Status, Status> {
    let result = sqlx::query("DELETE FROM pigeons WHERE id = ? AND owner_username = ?")
        .bind(id)
        .bind(&auth.username)
        .execute(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    if result.rows_affected() > 0 {
        Ok(Status::Ok)
    } else {
        Err(Status::NotFound)
    }
}

#[get("/pigeons?<search>&<color>&<page>&<per_page>")]
async fn search_pigeons(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
    search: Option<String>,
    color: Option<String>,
    page: Option<i64>,
    per_page: Option<i64>,
) -> Result<Json<PigeonSearchResult>, Status> {
    let page = page.unwrap_or(1).max(1);
    let per_page = per_page.unwrap_or(10).max(1).min(100);
    let offset = (page - 1) * per_page;

    let mut query_str = "SELECT id, name, color, age, description, owner_username FROM pigeons WHERE owner_username = ?".to_string();
    let mut count_query_str = "SELECT COUNT(*) as count FROM pigeons WHERE owner_username = ?".to_string();
    
    let mut params: Vec<String> = vec![auth.username.clone()];
    let mut count_params: Vec<String> = vec![auth.username.clone()];

    if let Some(ref search_term) = search {
        query_str.push_str(" AND (name LIKE ? OR description LIKE ?)");
        count_query_str.push_str(" AND (name LIKE ? OR description LIKE ?)");
        let like_pattern = format!("%{}%", search_term);
        params.push(like_pattern.clone());
        params.push(like_pattern.clone());
        count_params.push(like_pattern.clone());
        count_params.push(like_pattern);
    }

    if let Some(ref color_filter) = color {
        query_str.push_str(" AND color = ?");
        count_query_str.push_str(" AND color = ?");
        params.push(color_filter.clone());
        count_params.push(color_filter.clone());
    }

    query_str.push_str(" LIMIT ? OFFSET ?");
    params.push(per_page.to_string());
    params.push(offset.to_string());

    let mut query = sqlx::query_as(&query_str);
    for param in &params {
        query = query.bind(param);
    }
    
    let pigeons: Vec<Pigeon> = query
        .fetch_all(&mut **db)
        .await
        .map_err(|e| {
            println!("{:?}", e);
            Status::InternalServerError
        })?;

    let mut count_query = sqlx::query_as(&count_query_str);
    for param in &count_params {
        count_query = count_query.bind(param);
    }

    let total: (i64,) = count_query
        .fetch_one(&mut **db)
        .await
        .map_err(|e| {
            println!("{:?}", e);
            Status::InternalServerError
        })?;

    Ok(Json(PigeonSearchResult {
        pigeons,
        total: total.0,
        page,
        per_page,
    }))
}

#[put("/pigeons/<id>", data = "<pigeon_data>")]
async fn update_pigeon(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
    id: i64,
    pigeon_data: Json<PigeonUpdateRequest>,
) -> Result<Json<Pigeon>, Status> {
    let pigeon: Option<Pigeon> = sqlx::query_as(
        "SELECT id, name, color, age, description, owner_username FROM pigeons WHERE id = ? AND owner_username = ?"
    )
        .bind(id)
        .bind(&auth.username)
        .fetch_optional(&mut **db)
        .await
        .map_err(|e| { println!("{:?}", e);Status::InternalServerError })?;

    let mut pigeon = pigeon.ok_or(Status::NotFound)?;

    if let Some(name) = &pigeon_data.name {
        pigeon.name = name.clone();
    }
    if let Some(color) = &pigeon_data.color {
        pigeon.color = color.clone();
    }
    if let Some(age) = pigeon_data.age {
        pigeon.age = age;
    }
    if let Some(description) = &pigeon_data.description {
        pigeon.description = description.clone();
    }

    sqlx::query(
        "UPDATE pigeons SET name = ?, color = ?, age = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
        .bind(&pigeon.name)
        .bind(&pigeon.color)
        .bind(pigeon.age)
        .bind(&pigeon.description)
        .bind(id)
        .execute(&mut **db)
        .await
        .map_err(|e| { println!("{:?}", e);Status::InternalServerError })?;

    Ok(Json(pigeon))
}

#[get("/pigeons/<id>")]
async fn get_pigeon_by_id(
    mut db: Connection<PigeonDb>,
    auth: AuthToken,
    id: i64,
) -> Result<Json<Pigeon>, Status> {
    let pigeon: Option<Pigeon> = sqlx::query_as(
        "SELECT id, name, color, age, description, owner_username FROM pigeons WHERE id = ? AND owner_username = ?",
    )
        .bind(id)
        .bind(&auth.username)
        .fetch_optional(&mut **db)
        .await
        .map_err(|_| Status::InternalServerError)?;

    pigeon.map(Json).ok_or(Status::NotFound)
}

pub(crate) fn routes() -> Vec<rocket::Route> {
    routes![
        get_pigeons,
        create_pigeon,
        delete_pigeon,
        search_pigeons,
        update_pigeon,
        get_pigeon_by_id
    ]
}

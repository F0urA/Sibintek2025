mod auth;
mod pigeons;
mod user;
mod messages;

pub fn routes() -> Vec<rocket::Route> {
    let mut routes = Vec::new();
    routes.extend(pigeons::routes());
    routes.extend(user::routes());
    routes.extend(auth::routes());
    routes.extend(messages::routes());
    routes
}

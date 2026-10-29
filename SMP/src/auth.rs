use crate::models::Claims;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rocket::http::Status;
use rocket::request::{FromRequest, Outcome, Request};
use std::sync::RwLock;

const SECRET: RwLock<[u8; 32]> = RwLock::new([0; 32]);

pub fn init(){
    let binding = SECRET;
    let mut secret = binding.write().unwrap();
    *secret = rand::random();
}

pub fn generate_token(username: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now()
        .checked_add_signed(chrono::Duration::hours(24))
        .unwrap()
        .timestamp() as usize;

    let claims = Claims {
        sub: username.to_owned(),
        exp: expiration,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(&*SECRET.write().unwrap()),
    )
}

pub struct AuthToken {
    pub username: String
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthToken {
    type Error = ();

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let token = request.headers().get_one("Authorization");

        match token {
            Some(token) => {
                let token = token.trim_start_matches("Bearer ");
                match decode::<Claims>(
                    token,
                    &DecodingKey::from_secret(&*SECRET.write().unwrap()),
                    &Validation::default(),
                ) {
                    Ok(token_data) => Outcome::Success(AuthToken {
                        username: token_data.claims.sub,
                    }),
                    Err(_) => Outcome::Error((Status::Unauthorized, ())),
                }
            }
            None => Outcome::Error((Status::Unauthorized, ())),
        }
    }
}

export const SPOTIFY_CLIENT_ID = "ea55462b6275483da05b1c66671bff21";
export const SPOTIFY_CLIENT_SECRET = "8496fdc443c44e86b9fbded2a5ab13d5";
export const DOWNLOADS_FOLDER_NAME = "Spotify Downloads";
export const SERVER_PORT = 4000;
export const ENVIRONMENT = "Production";
export const BASE_API_URL =
	ENVIRONMENT == "Production" ? `http://localhost:${SERVER_PORT}` : `http://localhost:${SERVER_PORT}`;

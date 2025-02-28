import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "./parameters";

export async function getSpotifyToken() {
	try {
		const response = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
			},
			body: "grant_type=client_credentials",
		});

		if (!response.ok) {
			throw new Error("Failed to get Spotify token");
		}

		const data = await response.json();
		return data.access_token;
	} catch (error) {
		console.error("Error getting Spotify token:", error);
		throw error;
	}
}

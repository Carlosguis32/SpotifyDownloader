import { useState } from "react";
import "./App.css";
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, YOUTUBE_API_KEY, YOUTUBE_URL_PREFIX } from "./parameters";

function App() {
	const [playlistId, setPlaylistId] = useState("");
	const [spotifyToken, setSpotifyToken] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	async function getSpotifyToken() {
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
			setSpotifyToken(data.access_token);
			return data.access_token;
		} catch (error) {
			console.error("Error getting Spotify token:", error);
			throw error;
		}
	}

	async function downloadSong(url) {
		try {
			setIsLoading(true);
			console.log(url);
			const apiUrl = `http://localhost:4000/download`;
			const params = new URLSearchParams({ url });

			const response = await fetch(`${apiUrl}?${params.toString()}`);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Download failed");
			}
		} catch (error) {
			console.error("Download failed:", error);
			alert("An error occurred while downloading the video. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}

	async function getFirstVideoURL(searchInput) {
		if (!YOUTUBE_API_KEY) {
			throw new Error("No API key is provided");
		}

		const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&type=video&part=id&maxResults=1&q=${encodeURIComponent(
			searchInput
		)}`;

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error("Error fetching data from YouTube API");
			}

			const data = await response.json();

			if (!data.items || data.items.length === 0) {
				throw new Error("No videos found");
			}

			return `${YOUTUBE_URL_PREFIX}${data.items[0].id.videoId}`;
		} catch (error) {
			console.error("YouTube API Error:", error.message);
			return null;
		}
	}

	async function getSpotifyPlaylistData(fetchURL) {
		try {
			let token = spotifyToken;
			if (!token) {
				token = await getSpotifyToken();
			}

			const playlistIdMatch = playlistId.match(/playlist\/([a-zA-Z0-9]+)/);
			const actualPlaylistId = playlistIdMatch ? playlistIdMatch[1] : playlistId;

			let apiUrl;

			if (fetchURL) {
				apiUrl = fetchURL;
			} else {
				apiUrl = `https://api.spotify.com/v1/playlists/${actualPlaylistId}/tracks`;
			}
			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 401) {
					token = await getSpotifyToken();
					return getSpotifyPlaylistData();
				}
				const errorData = await response.json();
				throw new Error(errorData.error.message || "Failed to fetch playlist");
			}

			const data = await response.json();

			for (const item of data.items) {
				const videoUrl = await getFirstVideoURL(
					`${item.track.artists[0].name} - ${item.track.name} - Album: ${item.track.album.name}`
				);

				await downloadSong(videoUrl);
			}

			if (data.next) {
				await getSpotifyPlaylistData(data.next);
			}
		} catch (error) {
			console.error("Error fetching playlist:", error);
			alert("Failed to fetch Spotify playlist. Please check the playlist ID and try again.");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="container">
			<h1>Spotify Downloader</h1>

			<button onClick={() => getSpotifyPlaylistData()} disabled={isLoading}>
				{isLoading ? "Downloading..." : "Download"}
			</button>

			<input
				type="text"
				placeholder="Enter playlist url"
				onChange={(e) => setPlaylistId(e.target.value)}
				disabled={isLoading}
			/>
		</div>
	);
}

export default App;

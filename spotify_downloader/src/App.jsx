import { useState } from "react";
import { getSpotifyToken } from "./functions";
import { BASE_API_URL } from "./parameters";
import { Flex, Button, TextField, Heading, Text } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import "./App.css";

function App() {
	const [contentId, setContentId] = useState("");
	const [spotifyToken, setSpotifyToken] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [currentSongImage, setCurrentSongImage] = useState(null);
	const [currentSongName, setCurrentSongName] = useState("");
	const [currentVideoUrl, setCurrentVideoUrl] = useState("");
	const [currentArtistName, setCurrentArtistName] = useState("");
	const [modifiedQuery, setModifiedQuery] = useState("");

	async function downloadSong(data) {
		try {
			setIsLoading(true);
			const params = new URLSearchParams({
				url: data.url,
				artist: data.artist,
				album: data.album,
				title: data.title,
				year: data.year,
				imageUrl: data.imageUrl,
			});

			const response = await fetch(`${BASE_API_URL}/download?${params.toString()}`);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Download failed");
			}
		} catch (error) {
			console.error("Download failed:", error);
		}
	}

	async function getSpotifyData(fetchUrl) {
		try {
			let token = spotifyToken;
			let contentType;
			let actualUrlIdMatching;
			let apiUrl;
			let tracksRequestUrl;

			const playlistIdMatching = contentId.match(/playlist\/([a-zA-Z0-9]+)/);
			const trackIdMatching = contentId.match(/track\/([a-zA-Z0-9]+)/);

			if (playlistIdMatching) {
				contentType = "playlists";
				actualUrlIdMatching = playlistIdMatching ? playlistIdMatching[1] : contentId;
				tracksRequestUrl = "/tracks";
				setModifiedQuery("");
			} else if (trackIdMatching) {
				contentType = "tracks";
				actualUrlIdMatching = trackIdMatching ? trackIdMatching[1] : contentId;
				tracksRequestUrl = "";
			}

			if (fetchUrl) {
				apiUrl = fetchUrl;
			} else {
				apiUrl = `https://api.spotify.com/v1/${contentType}/${actualUrlIdMatching}${tracksRequestUrl}`;
			}

			if (!token) {
				token = await getSpotifyToken();
				setSpotifyToken(token);
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
					return getSpotifyData();
				}

				const errorData = await response.json();
				throw new Error(errorData.error.message || "Failed to fetch playlist");
			}

			const data = await response.json();

			if (contentType === "tracks") {
				setCurrentSongName(data.name);
				setCurrentArtistName(
					data.artists
						.map((artist, index, array) => (index === array.length - 1 ? artist.name : `${artist.name}, `))
						.join("")
				);
				setCurrentSongImage(data.album.images[0].url);

				const videoDataDetails = await identifySong({ track: data });
				await downloadSong(videoDataDetails);
			} else {
				for (const item of data.items) {
					setCurrentSongName(item.track.name);
					setCurrentArtistName(
						item.track.artists
							.map((artist, index, array) =>
								index === array.length - 1 ? artist.name : `${artist.name}, `
							)
							.join("")
					);
					setCurrentSongImage(item.track.album.images[0].url);

					const videoDataDetails = await identifySong(item);
					await downloadSong(videoDataDetails);
				}

				if (data.next) {
					await getSpotifyData(data.next);
				}
			}
		} catch (error) {
			console.error("Error fetching playlist:", error);
			alert("Failed to fetch Spotify playlist. Please check the playlist ID and try again.");
		} finally {
			setIsLoading(false);

			await fetch(`${BASE_API_URL}/log-failed-downloads`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
		}
	}

	async function identifySong(item) {
		let searchQuery;

		if (modifiedQuery) {
			searchQuery = modifiedQuery;
			setModifiedQuery("");
		} else {
			searchQuery = `Song: ${item.track.name}, Artist: ${item.track.artists[0].name}, ${item.track.external_urls.spotify}`;
		}
		const params = new URLSearchParams({
			query: searchQuery,
		});

		console.log(`Searching for: ${searchQuery}`);
		console.log(params.toString());

		let response = await fetch(`${BASE_API_URL}/youtube_search?${params.toString()}`);

		if (!response.ok) {
			const secondarySearchQuery = `${item.track.name}: ${item.track.artists[0].name}`;
			const secondaryParams = new URLSearchParams({
				query: secondarySearchQuery,
			});
			console.log(`Secondary query for: ${secondarySearchQuery}`);
			console.log(secondaryParams.toString());

			response = await fetch(`${BASE_API_URL}/youtube_search?${secondaryParams.toString()}`);

			if (!response.ok) {
				throw new Error("Failed to fetch the Youtube video");
			}
		}

		const videoData = await response.json();

		setCurrentVideoUrl(videoData.videoUrl);

		const videoDataDetails = {
			url: videoData.videoUrl,
			artist: item.track.artists
				.map((artist, index, array) => (index === array.length - 1 ? artist.name : `${artist.name}, `))
				.join(""),
			album: item.track.album.name,
			title: item.track.name,
			year: item.track.album.release_date.split("-")[0],
			imageUrl: item.track.album.images[0].url,
		};

		return videoDataDetails;
	}

	return (
		<Flex gap="9" justify="center" align="center" height="100vh" width="100vw" direction="column">
			<Heading size="9">Spotify Downloader</Heading>

			<Flex direction="column" align="center" justify="center" gap="5">
				<Flex gap="4" direction="column">
					<TextField.Root
						style={{ width: "600px" }}
						placeholder="Enter playlist URL"
						type="text"
						onChange={(e) => setContentId(e.target.value)}
						disabled={isLoading}
						size="3">
						<TextField.Slot>
							<MagnifyingGlassIcon height="16" width="16" />
						</TextField.Slot>
					</TextField.Root>

					<TextField.Root
						style={{ width: "600px" }}
						placeholder="(Optional) Modify Youtube search query when searching a single song"
						type="text"
						onChange={(e) => setModifiedQuery(e.target.value)}
						value={modifiedQuery}
						disabled={isLoading}
						size="3">
						<TextField.Slot>
							<MagnifyingGlassIcon height="16" width="16" />
						</TextField.Slot>
					</TextField.Root>

					<Button size="4" onClick={() => getSpotifyData()} loading={isLoading}>
						Download
					</Button>
				</Flex>

				{currentSongImage && <img src={currentSongImage} alt="Album cover" width="300rem" />}

				{currentSongName && (
					<Text color="white">{`${currentArtistName || "Unknown Artist"} - ${currentSongName}`}</Text>
				)}

				{currentSongName && currentVideoUrl && (
					<Text color="white">
						Source:{" "}
						<a
							href={currentVideoUrl}
							target="_blank"
							rel="noopener noreferrer"
							style={{ color: "inherit", textDecoration: "underline" }}>
							{currentVideoUrl}
						</a>
					</Text>
				)}
			</Flex>
		</Flex>
	);
}

export default App;

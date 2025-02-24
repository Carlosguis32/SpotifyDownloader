import { useState } from "react";
import "./App.css";

function App() {
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const downloadSong = async (url) => {
		try {
			setIsLoading(true);
			const apiUrl = `http://localhost:4000/download`;
			const params = new URLSearchParams({ url });

			const response = await fetch(`${apiUrl}?${params.toString()}`);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Download failed");
			}

			alert("Download completed! Check your Desktop/SpotifyDownloads folder");
		} catch (error) {
			console.error("Download failed:", error);
			alert("An error occurred while downloading the video. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDownload = async () => {
		if (!url) {
			alert("Please enter a URL");
			return;
		}

		try {
			await downloadSong(url);
		} catch (error) {
			console.error("Error downloading:", error);
			alert("Failed to download. Please check the URL and try again.");
		}
	};

	return (
		<div className="container">
			<h1>Youtube Downloader</h1>
			<input
				type="text"
				placeholder="Enter url"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
				disabled={isLoading}
			/>
			<button onClick={handleDownload} disabled={isLoading}>
				{isLoading ? "Downloading..." : "Download"}
			</button>
		</div>
	);
}

export default App;

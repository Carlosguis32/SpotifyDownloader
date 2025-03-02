import express from "express";
import process from "node:process";
import * as dotenv from "dotenv-flow";
import cors from "cors";
import youtubedl from "youtube-dl-exec";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import NodeID3 from "node-id3";
import { Buffer } from "buffer";
import yts from "yt-search";
import { appendFile } from "fs/promises";

dotenv.config({
	default_node_env: "development",
});

const app = express();
app.use(cors());

const outputPath = join(process.env.USERPROFILE, "Desktop", process.env.DOWNLOADS_FOLDER_NAME);
let imageBuffer;
let missingSongs = [];

app.get("/download", async (req, res) => {
	if (!existsSync(outputPath)) {
		mkdirSync(outputPath, { recursive: true });
	}

	try {
		console.log("Starting download...");
		console.log("URL:", req.query.url);

		const sanitizedTitle = (req.query.title || "Unknown Title")
			.replace(/[<>:"/\\|?*]/g, "")
			.replace(/\./g, "")
			.trim();

		let fileName = `${sanitizedTitle}.mp3`;
		let filePath = join(outputPath, fileName);
		let counter = 1;

		while (existsSync(filePath)) {
			fileName = `${sanitizedTitle} (${counter}).mp3`;
			filePath = join(outputPath, fileName);
			counter++;
		}

		const options = {
			extractAudio: true,
			audioFormat: "mp3",
			audioQuality: 0,
			output: filePath,
			windowsFilenames: true,
		};

		console.log("Downloading and converting to .mp3...");

		await youtubedl(req.query.url, options);

		if (!existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}

		console.log("Writing tags...");

		try {
			writeMetadata(req.query, filePath);
			console.log("Tags written correctly, download completed successfully\n");
		} catch (error) {
			console.error(`Metadata could not be written: ${error}\n`);
		}

		res.status(200).json({
			message: "Download completed",
			filePath,
		});
	} catch (error) {
		console.error("Error:", error, "\n");
		missingSongs.push(req.query.artist + " - " + req.query.title);
		res.status(500).json({
			error: "Error downloading",
			details: error.message,
		});
	}
});

app.get("/youtube_search", async (req, res) => {
	try {
		const response = await yts(req.query);

		if (!response || !response?.videos?.[0]?.url) {
			return res.status(404).json({
				error: "Video not found",
			});
		}

		res.status(200).json({
			videoUrl: `${response.videos[0].url}`,
		});
	} catch (error) {
		console.error("YouTube search error:", error);
		res.status(500).json({
			error: "Failed to search YouTube",
			details: error.message,
		});
	}
});

app.post("/log-failed-downloads", async (_, res) => {
	try {
		const logPath = join(
			process.env.USERPROFILE,
			"Desktop",
			process.env.DOWNLOADS_FOLDER_NAME,
			"failed_downloads.txt"
		);

		if (missingSongs.length > 0) {
			console.log("Missing songs:", missingSongs);
			const missingSongsEntry = "Missing songs:\n" + missingSongs.join("\n") + "\n\n";
			await appendFile(logPath, missingSongsEntry);
			missingSongs = [];
		}

		res.status(200).json({ message: "Failed downloads logged successfully" });
	} catch (error) {
		console.error("Error logging failed downloads:", error);
		res.status(500).json({ error: "Failed to log download failures" });
	}
});

app.get("/get/spotify-token", async (_, res) => {
	try {
		console.log(process.env.SPOTIFY_API_CLIENT_ID);

		const response = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization:
					"Basic " + btoa(`${process.env.SPOTIFY_API_CLIENT_ID}:${process.env.SPOTIFY_API_CLIENT_SECRET}`),
			},
			body: "grant_type=client_credentials",
		});

		if (!response.ok) {
			return res.status(500).json({ error: "Failed to get the Spotify token" });
		}

		const data = await response.json();
		return res.status(200).json({ token: data.access_token });
	} catch (error) {
		console.error("Error getting Spotify token:", error);
		throw error;
	}
});

async function writeMetadata(metadata, filePath) {
	if (metadata.imageUrl) {
		try {
			const imageResponse = await fetch(metadata.imageUrl);
			imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
		} catch (error) {
			console.error(`Album image could not be found: ${error}`);
		}
	}

	const tags = {
		title: metadata.title || "Unknown Title",
		artist: metadata.artist || "Unknown Artist",
		album: metadata.album || "Unknown Album",
		year: metadata.year || "Unknown Year",
		image: {
			mime: "image/jpeg",
			type: {
				id: 3,
				name: "Front cover",
			},
			imageBuffer: imageBuffer || null,
		},
	};

	try {
		NodeID3.write(tags, filePath);
	} catch (error) {
		throw Error(`Metadata could not be written: ${error}`);
	}
}

app.listen(parseInt(process.env.PORT), () => {
	console.log(`Server running in http://localhost:${parseInt(process.env.PORT)}`);
	console.log("Available routes:");
	app._router.stack.forEach((r) => {
		if (r.route && r.route.path) {
			console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
		}
	});
});

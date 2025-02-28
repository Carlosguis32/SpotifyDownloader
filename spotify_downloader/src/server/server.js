import express from "express";
import process from "node:process";
import cors from "cors";
import youtubedl from "youtube-dl-exec";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import NodeID3 from "node-id3";
import { Buffer } from "buffer";
import yts from "yt-search";
import { DOWNLOADS_FOLDER_NAME, SERVER_PORT } from "../parameters.js";
import { appendFile } from "fs/promises";

const app = express();
app.use(cors());

const outputPath = join(process.env.USERPROFILE, "Desktop", DOWNLOADS_FOLDER_NAME);
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
	const response = await yts(req.query);

	if (!response || !response?.videos?.[0]?.url) {
		res.status(404).json({
			error: "Video not found",
		});
	} else {
		res.status(200).json({
			videoUrl: `${response.videos[0].url}`,
		});
	}
});

app.post("/log-failed-downloads", async (_, res) => {
	try {
		const logPath = join(process.env.USERPROFILE, "Desktop", DOWNLOADS_FOLDER_NAME, "failed_downloads.txt");

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

app.listen(SERVER_PORT, () => {
	console.log(`Server running in http://localhost:${SERVER_PORT}`);
});

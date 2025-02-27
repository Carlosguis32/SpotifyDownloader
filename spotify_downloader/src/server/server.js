import express from "express";
import process from "node:process";
import cors from "cors";
import youtubedl from "youtube-dl-exec";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import NodeID3 from "node-id3";
import { Buffer } from "buffer";
import yts from "yt-search";

const app = express();
app.use(cors());

app.get("/download", async (req, res) => {
	const { url, artist, album, title, year, imageUrl } = req.query;
	const outputPath = join(process.env.USERPROFILE, "Desktop", "SpotifyDownloads");

	if (!existsSync(outputPath)) {
		mkdirSync(outputPath, { recursive: true });
	}

	try {
		console.log("1. Iniciando descarga...");
		console.log("URL:", url);

		const fileName = `${title}.mp3`;
		const filePath = join(outputPath, fileName);

		const options = {
			extractAudio: true,
			audioFormat: "mp3",
			audioQuality: 0,
			output: filePath,
			windowsFilenames: true,
		};

		console.log("2. Descargando y convirtiendo a MP3...");
		await youtubedl(url, options);

		if (!existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}

		console.log("3. Escribiendo etiquetas...");

		let imageBuffer;
		if (imageUrl) {
			console.log("Descargando imagen de portada... " + imageUrl);
			const imageResponse = await fetch(imageUrl);
			imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
		}

		const tags = {
			title: title,
			artist: artist || "Unknown Artist",
			album: album || "Unknown Album",
			year: year || "Unknown Year",
			image: {
				mime: "image/jpeg",
				type: {
					id: 3,
					name: "Front cover",
				},
				description: "Album Art",
				imageBuffer: imageBuffer,
			},
		};

		NodeID3.write(tags, filePath);

		console.log("4. Etiquetas escritas correctamente");

		res.status(200).json({
			message: "Descarga completada",
			filePath,
		});
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({
			error: "Error en la descarga",
			details: error.message,
		});
	}
});

app.get("/youtube_search", async (req, res) => {
	const response = await yts(req.query);

	console.log(response);

	if (!response) {
		throw new Error("No videos found");
	}

	const firstVideo = response.videos[0];

	console.log(firstVideo);

	res.status(200).json({
		videoUrl: `${firstVideo.url}`,
	});
});

const port = 4000;

app.listen(port, () => {
	console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

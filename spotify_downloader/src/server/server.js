import express from "express";
import process from "node:process";
import cors from "cors";
import youtubedl from "youtube-dl-exec";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const app = express();
app.use(cors());

app.get("/download", async (req, res) => {
	const videoURL = req.query.url;
	const outputPath = join(process.env.USERPROFILE, "Desktop", "SpotifyDownloads");

	if (!existsSync(outputPath)) {
		mkdirSync(outputPath, { recursive: true });
	}

	try {
		console.log("1. Iniciando descarga...");
		console.log("URL:", videoURL);

		const options = {
			extractAudio: true,
			audioFormat: "mp3",
			audioQuality: 0,
			output: join(outputPath, "%(title)s.%(ext)s"),
			windowsFilenames: true,
		};

		const videoInfo = await youtubedl(videoURL, {
			dumpJson: true,
			noWarnings: true,
			preferFreeFormats: true,
		});

		console.log("2. Información del video obtenida");
		const fileName = `${videoInfo.title.replace(/[^\w\s]/gi, "")}.mp3`;
		const filePath = join(outputPath, fileName);

		console.log("3. Descargando y convirtiendo a MP3...");
		await youtubedl(videoURL, options);

		console.log("4. Descarga completada");
		console.log("Archivo:", filePath);

		res.status(200).json({ message: "Descarga completada", filePath });
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({
			error: "Error en la descarga",
			details: error.message,
		});
	}
});

const port = 4000;

app.listen(port, () => {
	console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface ConversionResult {
  mp3Buffer: Buffer;
  durationSeconds: number;
}

/**
 * Convert a WAV buffer to MP3 using ffmpeg.
 * Returns the MP3 buffer and the audio duration in seconds.
 */
export async function convertWavToMp3(
  wavBuffer: Buffer
): Promise<ConversionResult> {
  const id = randomUUID();
  const inputPath = join(tmpdir(), `hymnotic-${id}.wav`);
  const outputPath = join(tmpdir(), `hymnotic-${id}.mp3`);

  try {
    await writeFile(inputPath, wavBuffer);

    const durationSeconds = await new Promise<number>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("libmp3lame")
        .audioBitrate(192)
        .audioChannels(2)
        .audioFrequency(44100)
        .format("mp3")
        .on("error", (err) =>
          reject(new Error(`FFmpeg conversion failed: ${err.message}`))
        )
        .on("end", () => {
          ffmpeg.ffprobe(outputPath, (probeErr, metadata) => {
            if (probeErr) {
              resolve(0);
            } else {
              resolve(metadata.format.duration ?? 0);
            }
          });
        })
        .save(outputPath);
    });

    const mp3Buffer = await readFile(outputPath);
    return { mp3Buffer, durationSeconds };
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

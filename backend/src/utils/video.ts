import { createError } from '../middleware/errorHandler';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MAX_VIDEO_DURATION_SECONDS = 300; // 5 minutes

interface VideoMetadata {
  duration: number; // in seconds
  fileSize: number; // in bytes
  format: string;
}

/**
 * Check video duration using ffprobe
 * Requires ffmpeg/ffprobe to be installed in the Docker container
 */
export async function checkVideoDuration(filePath: string): Promise<VideoMetadata> {
  try {
    // Use ffprobe to get video metadata
    const command = `ffprobe -v error -show_entries format=duration,size,format_name -of json "${filePath}"`;
    const { stdout } = await execAsync(command);

    const metadata = JSON.parse(stdout);
    const duration = parseFloat(metadata.format?.duration || '0');
    const fileSize = parseInt(metadata.format?.size || '0');
    const format = metadata.format?.format_name || 'unknown';

    // Validate duration
    if (duration > MAX_VIDEO_DURATION_SECONDS) {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      throw createError(
        400,
        `Video too long (${minutes}:${seconds.toString().padStart(2, '0')}). Maximum duration: 5 minutes.`
      );
    }

    if (duration === 0) {
      throw createError(400, 'Invalid video file or unable to determine duration');
    }

    return {
      duration,
      fileSize,
      format,
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error; // Re-throw our custom errors
    }

    // ffprobe not installed or other error
    if (error.message.includes('ffprobe')) {
      throw createError(
        500,
        'Video processing not available. Please contact administrator.'
      );
    }

    throw createError(400, `Failed to process video: ${error.message}`);
  }
}

/**
 * Validate video file type
 */
export function validateVideoFile(mimetype: string): void {
  const allowedTypes = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/webm',
  ];

  if (!allowedTypes.includes(mimetype)) {
    throw createError(
      400,
      `Unsupported video format. Allowed formats: MP4, MOV, AVI, WebM`
    );
  }
}

/**
 * Example usage in import controller (future):
 *
 * const metadata = await checkVideoDuration(req.file.path);
 * console.log(`Video duration: ${metadata.duration}s, Size: ${metadata.fileSize} bytes`);
 */

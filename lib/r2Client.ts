
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// These environment variables must be configured in your deployment environment
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'baby-memories-backup';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://pub-xyz.r2.dev or https://images.yourdomain.com

export const isR2Configured = () => {
    return !!R2_ENDPOINT && !!R2_ACCESS_KEY_ID && !!R2_SECRET_ACCESS_KEY && !!R2_PUBLIC_URL;
};

// Initialize S3 client for Cloudflare R2
const s3Client = isR2Configured() ? new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
}) : null;

export const uploadFileToR2 = async (fileOrBlob: File | Blob, path: string): Promise<string> => {
    if (!s3Client || !isR2Configured()) {
        throw new Error("R2 is not configured correctly.");
    }

    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        Body: new Uint8Array(arrayBuffer),
        ContentType: fileOrBlob.type || "image/jpeg",
    });

    await s3Client.send(command);

    // Return the public URL to access the file
    const baseUrl = R2_PUBLIC_URL?.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
    return `${baseUrl}/${path}`;
};

export const deleteFileFromR2 = async (path: string): Promise<void> => {
    if (!s3Client || !isR2Configured()) {
        throw new Error("R2 is not configured correctly.");
    }

    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
    });

    await s3Client.send(command);
};


import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * Safely retrieves environment variables from various possible sources.
 * Prefers Vite's import.meta.env with VITE_ prefix.
 */
const getEnv = (key: string): string | undefined => {
    const viteKey = `VITE_${key}`;
    
    // 1. Try Vite's import.meta.env
    try {
        // @ts-ignore - import.meta.env is a Vite-specific feature
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[viteKey] || import.meta.env[key];
        }
    } catch (e) {}

    // 2. Try Node-style process.env (for local testing or other bundlers)
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[viteKey] || process.env[key];
        }
    } catch (e) {}

    return undefined;
};

const R2_ENDPOINT = getEnv('R2_ENDPOINT');
const R2_ACCESS_KEY_ID = getEnv('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = getEnv('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = getEnv('R2_BUCKET_NAME') || 'baby-memories-backup';
const R2_PUBLIC_URL = getEnv('R2_PUBLIC_URL'); 

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
        throw new Error("R2 is not configured correctly. Check your environment variables.");
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

export const listObjectsFromR2 = async (prefix: string) => {
    if (!s3Client || !isR2Configured()) {
        throw new Error("R2 is not configured correctly.");
    }

    const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
    });

    const response = await s3Client.send(command);
    const baseUrl = R2_PUBLIC_URL?.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;

    return (response.Contents || []).map(item => ({
        id: item.ETag || item.Key,
        name: item.Key?.split('/').pop() || '',
        url: `${baseUrl}/${item.Key}`,
        created_at: item.LastModified?.toISOString()
    }));
};

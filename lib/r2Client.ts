
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * Safely retrieves environment variables or local storage overrides.
 */
const getEnv = (key: string): string | undefined => {
    // Check localStorage first (User overrides in-app)
    const localValue = localStorage.getItem(`r2_config_${key}`);
    if (localValue) return localValue;

    const viteKey = `VITE_${key}`;
    // Try Vite's import.meta.env
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[viteKey] || import.meta.env[key];
        }
    } catch (e) {}

    // Try Node-style process.env
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[viteKey] || process.env[key];
        }
    } catch (e) {}

    return undefined;
};

let s3Client: S3Client | null = null;

export const isR2Configured = () => {
    const endpoint = getEnv('R2_ENDPOINT');
    const accessKey = getEnv('R2_ACCESS_KEY_ID');
    const secretKey = getEnv('R2_SECRET_ACCESS_KEY');
    const publicUrl = getEnv('R2_PUBLIC_URL');
    return !!endpoint && !!accessKey && !!secretKey && !!publicUrl;
};

export const getR2PublicUrl = () => {
    const url = getEnv('R2_PUBLIC_URL');
    if (!url) return '';
    return url.endsWith('/') ? url : `${url}/`;
};

const getBucketName = () => getEnv('R2_BUCKET_NAME') || 'baby-memories-backup';

// Initialize or Re-initialize S3 client
export const refreshR2Client = () => {
    if (isR2Configured()) {
        s3Client = new S3Client({
            region: "auto",
            endpoint: getEnv('R2_ENDPOINT'),
            credentials: {
                accessKeyId: getEnv('R2_ACCESS_KEY_ID')!,
                secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY')!,
            },
        });
    } else {
        s3Client = null;
    }
};

// Initial setup
refreshR2Client();

export const uploadFileToR2 = async (fileOrBlob: File | Blob, path: string): Promise<string> => {
    if (!s3Client) refreshR2Client();
    if (!s3Client) throw new Error("R2 is not configured.");

    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const command = new PutObjectCommand({
        Bucket: getBucketName(),
        Key: path,
        Body: new Uint8Array(arrayBuffer),
        ContentType: fileOrBlob.type || "image/jpeg",
    });

    await s3Client.send(command);
    const baseUrl = getR2PublicUrl().replace(/\/$/, '');
    return `${baseUrl}/${path}`;
};

export const deleteFileFromR2 = async (path: string): Promise<void> => {
    if (!s3Client) refreshR2Client();
    if (!s3Client) throw new Error("R2 is not configured.");

    const command = new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: path,
    });

    await s3Client.send(command);
};

export const listObjectsFromR2 = async (prefix: string) => {
    if (!s3Client) refreshR2Client();
    if (!s3Client) throw new Error("R2 is not configured.");

    const command = new ListObjectsV2Command({
        Bucket: getBucketName(),
        Prefix: prefix,
    });

    const response = await s3Client.send(command);
    const baseUrl = getR2PublicUrl().replace(/\/$/, '');

    return (response.Contents || []).map(item => ({
        id: item.ETag || item.Key,
        name: item.Key?.split('/').pop() || '',
        url: `${baseUrl}/${item.Key}`,
        created_at: item.LastModified?.toISOString()
    }));
};

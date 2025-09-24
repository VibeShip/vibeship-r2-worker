// This code is a Cloudflare Worker that generates a pre-signed URL for R2 uploads.
// It is a secure backend for your front-end application.

import { AwsClient } from 'aws4fetch';

// This is the main Worker handler. It receives the request and the environment variables.
export default {
    async fetch(request, env) {
        // Only respond to the specific endpoint for generating upload URLs
        const url = new URL(request.url);
        if (request.method === 'POST' && url.pathname === '/get-upload-url') {
            try {
                const body = await request.json();
                const filename = body.filename;

                if (!filename) {
                    return new Response(JSON.stringify({ error: 'Filename is required' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // Initialize the AwsClient using secure environment variables
                const aws = new AwsClient({
                    accessKeyId: env.R2_ACCESS_KEY_ID,
                    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
                    region: 'auto'
                });

                // Generate the pre-signed URL
                const signedUrl = await getSignedUrl(filename, env, aws);
                
                return new Response(JSON.stringify({ preSignedUrl: signedUrl }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('Error generating pre-signed URL:', error);
                return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Return a 404 for any other requests
        return new Response('Not Found', { status: 404 });
    }
};

/**
 * Function to generate the pre-signed URL.
 * It's kept separate for clarity but could be inlined.
 */
async function getSignedUrl(filename, env, aws) {
    // Construct the URL to the R2 object using the Account ID and Bucket Name from env
    const r2Url = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.VIBESHIP_VIDEOS.bucketName}/${filename}`;
    
    // Sign the URL for a PUT request, expiring in 60 seconds
    const signedRequest = await aws.sign(r2Url, {
        method: 'PUT',
        aws: {
            service: 's3' 
        },
        headers: {
            'Content-Type': 'video/mp4'
        },
        expires: 60
    });
    
    return signedRequest.url;
}

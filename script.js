// Configuration
const CLIENT_ID = '5c6392fcea084d34bf0405577b872b09'; // Your Spotify Client ID
const CLIENT_SECRET = 'bee1ff4486384154a337a95b764e311e'; // Your Spotify Client Secret
const REDIRECT_URI = 'http://127.0.0.1:5500/index.html'; // Your Redirect URI
const SCOPES = 'playlist-read-private playlist-modify-public playlist-modify-private';
const YOUTUBE_CLIENT_ID = '104728575565-g9do0tggh1gs79kua461hoj7cg3ofba5.apps.googleusercontent.com'; // Your YouTube Client ID
const YOUTUBE_CLIENT_SECRET = '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'; // Your YouTube Client Secret

// OAuth 2.0 URLs
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const YOUTUBE_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Redirect users to Spotify login for authorization
function redirectToSpotifyAuth() {
    const authUrl = `${SPOTIFY_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
}

// Redirect users to YouTube login for authorization
function redirectToYouTubeAuth() {
    const authUrl = `${YOUTUBE_AUTH_URL}?client_id=${YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl`;
    window.location.href = authUrl;
}

// Parse the authorization code from the URL
function getCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Exchange the authorization code for an access token
async function getAccessToken(code, isYouTube) {
    const tokenUrl = isYouTube ? YOUTUBE_TOKEN_URL : SPOTIFY_TOKEN_URL;
    const clientId = isYouTube ? YOUTUBE_CLIENT_ID : CLIENT_ID;
    const clientSecret = isYouTube ? YOUTUBE_CLIENT_SECRET : CLIENT_SECRET;

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: clientId,
            client_secret: clientSecret
        })
    });

    const data = await response.json();
    return data.access_token;
}

// Use the Access Token to make API Requests
async function getSpotifyPlaylistTracks(playlistId, accessToken) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const data = await response.json();
    return data.items.map(item => item.track);
}

// Create a new YouTube playlist
async function createYouTubePlaylist(title, description, accessToken) {
    const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet&access_token=' + accessToken, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            snippet: {
                title: title,
                description: description,
            }
        })
    });

    const data = await response.json();
    return data.id;
}

// Add a video to a YouTube playlist
async function addVideoToYouTubePlaylist(playlistId, videoId, accessToken) {
    await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&access_token=' + accessToken, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            snippet: {
                playlistId: playlistId,
                resourceId: {
                    kind: 'youtube#video',
                    videoId: videoId
                }
            }
        })
    });
}

// Search for a YouTube video by title
async function searchYouTubeVideo(query, accessToken) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&access_token=${accessToken}`);
    const data = await response.json();
    return data.items[0] ? data.items[0].id.videoId : null;
}

// Handle the conversion process
document.getElementById('convert-button').addEventListener('click', async function() {
    const spotifyLink = document.getElementById('spotify-link').value;
    if (!spotifyLink) {
        alert("Please enter a Spotify playlist link.");
        return;
    }

    // Show loading animation
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('result').classList.add('hidden');

    const code = getCodeFromUrl();
    console.log('Authorization Code:', code); // Debug log

    if (code) {
        try {
            // Get Spotify access token
            const spotifyAccessToken = await getAccessToken(code, false);
            console.log('Spotify Access Token:', spotifyAccessToken); // Debug log
            
            const playlistId = new URL(spotifyLink).pathname.split('/')[2]; // Extract playlist ID from URL
            const tracks = await getSpotifyPlaylistTracks(playlistId, spotifyAccessToken);
            console.log('Tracks:', tracks); // Debug log
            
            // Redirect to YouTube login
            redirectToYouTubeAuth();
        } catch (error) {
            console.error('Error:', error); // Detailed error logging
            alert('Failed to process the Spotify playlist.');
            document.getElementById('loading').classList.add('hidden');
        }
    } else {
        redirectToSpotifyAuth();
    }
});

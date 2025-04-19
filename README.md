 # MCP Video App - Setup & Run Instructions

## Prerequisites
- Node.js installed (v14 or newer)
- FFmpeg installed (required for video processing)

## Project Structure
First, create a project folder for the MCP video app:

```
mcp-video-app/
├── server.js         # Backend server code
├── package.json      # Project dependencies
├── public/           # Frontend static files
│   ├── index.html    # Main HTML file
│   ├── app.js        # Frontend JavaScript
│   └── styles.css    # CSS styles
├── uploads/          # Folder for uploaded videos
└── processed/        # Folder for processed videos
```

## Setup Steps

1. **Create the project folder and navigate to it**
```bash
mkdir mcp-video-app
cd mcp-video-app
```

2. **Initialize the Node.js project**
```bash
npm init -y
```

3. **Install required dependencies**
```bash
npm install express cors multer morgan body-parser
```

4. **Create the server.js file**
Copy the server code from the "MCP Server - Backend Setup" artifact into this file.

5. **Create the directories for uploads and processed videos**
```bash
mkdir uploads
mkdir processed
mkdir public
```

6. **Create the frontend files**
Create `public/index.html` and copy the HTML from the "MCP Video App - Frontend" artifact.

7. **Create a basic CSS file (optional)**
Create `public/styles.css` for any additional styles.

8. **Create the frontend JavaScript**
Create `public/app.js` and copy the JavaScript part from the HTML file (everything inside the `<script>` tags).

## Running the Application

1. **Start the server**
```bash
node server.js
```

2. **Access the application**
Open your web browser and navigate to:
```
http://localhost:3000
```

## Troubleshooting

### FFmpeg Not Found
If you encounter errors related to FFmpeg:
- Make sure FFmpeg is installed on your system
- For Windows: Add FFmpeg to your PATH environment variable
- For Mac: `brew install ffmpeg`
- For Linux: `sudo apt install ffmpeg`

### Upload Issues
If you're having trouble uploading videos:
- Check that the uploads directory exists and has write permissions
- Verify the file size limit (default is 100MB)
- Check browser console for any JavaScript errors

### Video Processing Issues
If video processing fails:
- Verify FFmpeg is correctly installed and accessible
- Check server logs for any error messages
- Try with a smaller test video file first

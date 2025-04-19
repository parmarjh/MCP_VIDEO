// server.js - Main entry point for the MCP video app backend
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure storage for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Create output directory for processed videos
const outputDir = path.join(__dirname, 'processed');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/processed', express.static(path.join(__dirname, 'processed')));

// In-memory storage for projects (would use a database in production)
const projects = [];

// API Routes
// Get all projects
app.get('/api/projects', (req, res) => {
  res.json(projects);
});

// Create a new project
app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  const newProject = {
    id: Date.now().toString(),
    name,
    description,
    createdAt: new Date(),
    clips: [],
    status: 'draft'
  };
  projects.push(newProject);
  res.status(201).json(newProject);
});

// Upload video clip
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }
  
  const projectId = req.body.projectId;
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const clip = {
    id: Date.now().toString(),
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimeType: req.file.mimetype,
    uploadedAt: new Date()
  };
  
  project.clips.push(clip);
  res.status(201).json(clip);
});

// Process video
app.post('/api/process', (req, res) => {
  const { projectId, clipId, operation } = req.body;
  
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const clip = project.clips.find(c => c.id === clipId);
  if (!clip) {
    return res.status(404).json({ error: 'Clip not found' });
  }
  
  const outputFilename = `processed-${Date.now()}-${path.basename(clip.filename)}`;
  const outputPath = path.join(outputDir, outputFilename);
  
  let command;
  
  switch (operation) {
    case 'trim':
      const { start, duration } = req.body;
      command = `ffmpeg -i "${clip.path}" -ss ${start} -t ${duration} -c copy "${outputPath}"`;
      break;
    case 'resize':
      const { width, height } = req.body;
      command = `ffmpeg -i "${clip.path}" -vf "scale=${width}:${height}" "${outputPath}"`;
      break;
    case 'grayscale':
      command = `ffmpeg -i "${clip.path}" -vf "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3" "${outputPath}"`;
      break;
    default:
      return res.status(400).json({ error: 'Invalid operation' });
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error processing video: ${error}`);
      return res.status(500).json({ error: 'Failed to process video', details: error.message });
    }
    
    const processedClip = {
      id: Date.now().toString(),
      originalClipId: clip.id,
      originalName: clip.originalName,
      filename: outputFilename,
      path: outputPath,
      operation,
      processedAt: new Date()
    };
    
    project.clips.push(processedClip);
    res.json({
      success: true,
      clip: processedClip,
      url: `/processed/${outputFilename}`
    });
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`MCP Video Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

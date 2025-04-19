// server.js - Main application entry point
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const Queue = require('bull');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const renderRoutes = require('./routes/render');
const assetRoutes = require('./routes/assets');

// Import middleware
const { verifyToken } = require('./middleware/auth');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mcp-video-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Failed to connect to MongoDB:', err));

// Set up processing queues
const videoProcessingQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

const renderQueue = new Queue('video-rendering', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Set up Bull Board (queue monitoring)
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullAdapter(videoProcessingQueue),
    new BullAdapter(renderQueue)
  ],
  serverAdapter
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up Bull Board UI
serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', verifyToken, serverAdapter.getRouter());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', verifyToken, projectRoutes);
app.use('/api/render', verifyToken, renderRoutes);
app.use('/api/assets', verifyToken, assetRoutes);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Process video queue
videoProcessingQueue.process(async (job) => {
  const { inputPath, outputPath, options } = job.data;
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);
    
    // Apply processing options
    if (options.resize) {
      command = command.size(`${options.resize.width}x${options.resize.height}`);
    }
    
    if (options.format) {
      command = command.format(options.format);
    }
    
    if (options.audio) {
      if (options.audio.remove) {
        command = command.noAudio();
      } else if (options.audio.volume) {
        
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 5000;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');


const transporter = nodemailer.createTransport({
  host: 'smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: 'YOUR_MAILTRAP_USER',
    pass: 'YOUR_MAILTRAP_PASSWORD'
  }
});




const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: '$2b$10$X0bLg9icMA19u5iIt.vYjeozDCKQHLEUheshUWc43fBUsbmgKnKd2', // bcrypt hash for 'password123',
    resetToken: null,
    resetTokenExpiration: null
  }
];

app.use(cors({
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

//   app.use(cors({
//   origin: 'http://localhost:3000'
// })); 


app.use(express.json());

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(400).json({ message: 'No account with that email found.' });
  }

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    const token = buffer.toString('hex');
    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour

    // Send email with the token
    transporter.sendMail({
      to: email,
      from: 'no-reply@example.com',
      subject: 'Password Reset',
      html: `
        <p>You requested a password reset</p>
        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
      `
    });

    res.json({ message: 'Reset link sent to your email.' });
  });
});

app.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  const user = users.find(u => u.resetToken === token && u.resetTokenExpiration > Date.now());

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  user.password = hashedPassword;
  user.resetToken = null;
  user.resetTokenExpiration = null;

  res.json({ message: 'Password updated successfully!' });
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user) {
    console.log("User not found:", username);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  
  if (isPasswordValid) {
    const token = jwt.sign({ id: user.id, username: user.username }, 'YOUR_SECRET_KEY', { expiresIn: '1h' });
    return res.json({ token });
  } else {
    console.log(`Invalid password for user ${username}`);
    return res.status(401).json({ message: 'Invalid credentials' });
  }
});


//set up storage with multer
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

// Video storage configuration
const videoStorage = multer.diskStorage({
    destination: './video-uploads',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadsDir = path.join(__dirname, 'uploads');
const videoUploadsDir = path.join(__dirname, 'video-uploads');

if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(videoUploadsDir)) {
    fs.mkdirSync(videoUploadsDir);
}



const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error('Not an image'), false);
    }
  }
});

const videoUpload = multer({
    storage: videoStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error('Not a video'), false);
        }
    }
});

//To serve uploaded images and videos
app.use('/video-uploads', express.static(path.join(__dirname, '/video-uploads')));




app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();

    switch (ext) {
        case '.jpg':
        case '.jpeg':
            res.header('Content-Type', 'image/jpeg');
            break;
        case '.webp':
            res.header('Content-Type', 'image/webp');
            break;
        // add more cases if needed
    }
    next();
}, express.static(path.join(__dirname, '/uploads')));


//   app.use('*', (req, res) => {
//     res.status(404).send('Not Found');
// });



app.use('/video-uploads', express.static(path.join(__dirname, '/video-uploads')));

// app.use(cors({
//   origin: 'http://localhost:3000'
// })); 



app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Endpoint to get images
app.get('/api/getImages', (req, res) => {
  const directoryPath = path.join(__dirname, 'uploads');
  fs.readdir(directoryPath, (err, files) => {
      if (err) {
          res.status(500).send({
              message: "Unable to scan directory: " + err,
          });
      }


      // Return the list of files (this will be the list of uploaded images)
      res.send(files);
  });
});


// Endpoint to upload photos
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (req.file) {
        res.json({ filePath: `/uploads/${req.file.filename}` });
    } else {
        res.status(400).send("Error uploading photo");
    }
});

// Endpoint to delete photos
app.delete('/api/delete/:photoName', (req, res) => {
  const photoPath = path.join(__dirname, 'uploads', req.params.photoName);
  fs.unlink(photoPath, (err) => {
      if (err) {
          console.error("Server-side Error when deleting:", err); // log the detailed error
          return res.status(500).send("Error in deleting images: " + err.message);
      }
      res.status(200).send("Photo deleted");
  });
});

// Endpoint to upload videos
app.post('/api/uploadVideo', videoUpload.single('video'), (req, res) => {
    if (req.file) {
        res.json({ filePath: `/video-uploads/${req.file.filename}` });
    } else {
        res.status(400).send("Error uploading video");
    }
});

// Endpoint to delete videos
app.delete('/api/deleteVideo/:videoName', (req, res) => {
    const videoPath = path.join(videoUploadsDir, req.params.videoName);
    fs.unlink(videoPath, (err) => {
        if (err) {
            console.error("Error when deleting:", err);
            return res.status(500).send("Error in deleting videos: " + err.message);
        }
        res.status(200).send("Video deleted");
    });
});


// Endpoint to get videos
app.get('/api/getVideos', (req, res) => {
  const directoryPath = path.join(__dirname, 'video-uploads');
  fs.readdir(directoryPath, (err, files) => {
      if (err) {
          res.status(500).send({
              message: "Unable to scan directory: " + err,
          });
      }
      res.send(files);
  });
});






app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});

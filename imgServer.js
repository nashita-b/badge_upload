require('dotenv').config();

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.argv[2] || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files
app.set('view engine', 'ejs');

// Configure multer for file uploads
const upload = multer({
    dest: path.join(__dirname, 'uploads'), // Destination for uploaded files
    limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Upload Form' });
});

app.post('/submit', upload.single('idPhoto'), async (req, res) => {
    try {
        const { name, lastName, email, expirationDate } = req.body;
        const file = req.file;

        if (!file || !expirationDate) {
            return res.status(400).send("File and expiration date are required.");
        }

        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
            return res.status(400).send("Only JPEG and PNG files are allowed.");
        }

        // Compose the email
        const emailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: 'shadomdnow@gmail.com',
            subject: 'New Submission Received',
            text: `A new submission has been received from ${name} ${lastName} (${email}).

Expiration Date: ${expirationDate}`,
            attachments: [
                {
                    filename: file.originalname,
                    content: fs.createReadStream(file.path), // Attach the uploaded file directly
                },
            ],
        };

        // Send the email
        transporter.sendMail(emailOptions, (err, info) => {
            // Clean up the uploaded file after sending the email
            fs.unlinkSync(file.path);

            if (err) {
                console.error("Error sending email:", err);
                return res.status(500).send("Error sending email notification.");
            }

            console.log("Email sent:", info.response);

            // Render the thank-you page
            res.render('submit', {
                title: 'Thank You',
                submission: {
                    name: `${name} ${lastName}`,
                    email,
                    expirationDate,
                    filename: file.originalname,
                },
            });
        });

    } catch (err) {
        console.error("Error submitting data:", err);

        // Attempt to clean up the temporary file
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).send("Error submitting your data.");
    }
});

// Start the application
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

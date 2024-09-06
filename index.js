const express = require('express');
const { S3 } = require('aws-sdk');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());

const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

app.get('/video/:key', async (req, res) => {
  const key = req.params.key;
  const range = req.headers.range;

  try {
    const { ContentLength, ContentType } = await s3.headObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key  
    }).promise();

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : ContentLength - 1;

      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${ContentLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': ContentType,
      });

      const stream = s3.getObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Range: `bytes=${start}-${end}`
      }).createReadStream();

      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': ContentLength,
        'Content-Type': ContentType,
      });

      const stream = s3.getObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      }).createReadStream();

      stream.pipe(res);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
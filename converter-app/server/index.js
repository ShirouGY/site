import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Storage for multer in memory
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Convert image to another format using sharp
app.post('/api/convert/image', upload.single('file'), async (req, res) => {
  try {
    const format = (req.body?.format || '').toLowerCase(); // 'jpeg' | 'png' | 'webp'
    if (!req.file || !format) {
      return res.status(400).json({ error: 'Arquivo e formato são obrigatórios' });
    }

    const supported = ['jpeg', 'png', 'webp'];
    if (!supported.includes(format)) {
      return res.status(400).json({ error: 'Formato não suportado' });
    }

    let pipeline = sharp(req.file.buffer);
    if (format === 'jpeg') pipeline = pipeline.jpeg();
    if (format === 'png') pipeline = pipeline.png();
    if (format === 'webp') pipeline = pipeline.webp();

    const outputBuffer = await pipeline.toBuffer();

    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Content-Disposition', `attachment; filename=convertido.${format}`);
    res.send(outputBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha na conversão de imagem' });
  }
});

// Convert multiple images to a single PDF using pdfkit
app.post('/api/convert/images-to-pdf', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Envie ao menos uma imagem' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=imagens.pdf');

    const doc = new PDFDocument({ autoFirstPage: false });
    doc.pipe(res);

    for (const file of req.files) {
      // Detect dimensions via sharp para ajustar a página ao tamanho da imagem
      const meta = await sharp(file.buffer).metadata();
      const pageWidth = meta.width || 595; // fallback A4 width ~ 595 pt
      const pageHeight = meta.height || 842; // fallback A4 height ~ 842 pt
      doc.addPage({ size: [pageWidth, pageHeight] });
      doc.image(file.buffer, 0, 0, { width: pageWidth, height: pageHeight });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao gerar PDF' });
  }
});

// YouTube to mp3
app.get('/api/youtube/mp3', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'URL inválida' });
    }

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9-_ ]/g, '');

    res.setHeader('Content-Disposition', `attachment; filename="${title || 'audio'}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const audio = ytdl(url, { quality: 'highestaudio' });

    ffmpeg(audio)
      .audioBitrate(192)
      .toFormat('mp3')
      .on('error', (err) => {
        console.error('ffmpeg error', err);
        if (!res.headersSent) res.status(500).end('Erro ao converter para MP3');
      })
      .pipe(res, { end: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao converter YouTube para MP3' });
  }
});

// YouTube to mp4
app.get('/api/youtube/mp4', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'URL inválida' });
    }

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9-_ ]/g, '');

    res.setHeader('Content-Disposition', `attachment; filename="${title || 'video'}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    const video = ytdl(url, { quality: 'highestvideo' });
    const audio = ytdl(url, { quality: 'highestaudio' });

    const tmpDir = path.join(__dirname, 'tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, `${Date.now()}-output.mp4`);

    const command = ffmpeg()
      .addInput(video)
      .addInput(audio)
      .videoCodec('copy')
      .audioCodec('aac')
      .format('mp4')
      .on('error', (err) => {
        console.error('ffmpeg error', err);
        if (!res.headersSent) res.status(500).end('Erro ao converter para MP4');
      })
      .on('end', () => {
        const stream = fs.createReadStream(outputPath);
        stream.on('close', () => fs.unlink(outputPath, () => {}));
        stream.pipe(res);
      })
      .save(outputPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao converter YouTube para MP4' });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
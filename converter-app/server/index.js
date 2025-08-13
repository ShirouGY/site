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
import { spawn } from 'child_process';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Variável para controlar processos Python ativos
let activePythonProcesses = new Set();

// Função helper para executar script Python
async function executePythonScript(action, url, outputDir = './tmp', quality = 'best') {
  return new Promise((resolve, reject) => {
    console.log('Executando script Python:', { action, url, outputDir, quality });
    
    // Criar diretório se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('Caminho do script: converter.py');
    const args = ['converter.py', action, url, outputDir];
    if (action === 'mp4' && quality) {
      args.push(quality);
    }
    
    const pythonProcess = spawn('python3', args, {
      cwd: __dirname
    });
    
    // Adicionar processo à lista de ativos
    activePythonProcesses.add(pythonProcess);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('Python stderr:', data.toString());
    });
    
    pythonProcess.on('close', (code) => {
      console.log('Python process closed with code:', code);
      console.log('Python stdout:', stdout);
      console.log('Python stderr:', stderr);
      
      // Remover processo da lista de ativos
      activePythonProcesses.delete(pythonProcess);
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Erro ao parsear resultado: ${error.message}`));
        }
      } else {
        reject(new Error(`Script Python falhou: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.log('Python process error:', error);
      reject(new Error(`Erro ao executar script Python: ${error.message}`));
    });
    
    // Adicionar timeout mais longo para downloads
    const timeout = action === 'info' ? 45000 : 180000; // 45s para info, 3min para download
    const timeoutId = setTimeout(() => {
      console.log(`Timeout atingido (${timeout}ms), matando processo Python`);
      activePythonProcesses.delete(pythonProcess);
      pythonProcess.kill();
      reject(new Error(`Timeout ao executar script Python (${timeout}ms)`));
    }, timeout);
    
    // Limpar timeout se o processo terminar normalmente
    pythonProcess.on('close', () => {
      clearTimeout(timeoutId);
    });
  });
}

// Função helper para obter informações do vídeo usando Python
async function getYouTubeInfo(url) {
  const maxRetries = 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Obtendo informações do vídeo com Python (tentativa ${attempt}/${maxRetries})...`);
      const result = await executePythonScript('info', url);
      
      if (result.success) {
        console.log('Informações obtidas com sucesso');
        return result.info;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Erro ao obter informações (tentativa ${attempt}):`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      // Aguardar um pouco antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Função helper para download e conversão usando Python
async function downloadAndConvert(url, format = 'mp3', outputDir = './tmp', quality = 'best') {
  const maxRetries = 1; // Apenas 1 retry para downloads (são mais lentos)
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`Iniciando download e conversão para ${format} com Python (tentativa ${attempt}/${maxRetries + 1})...`);
      
      const result = await executePythonScript(format, url, outputDir, quality);
      console.log('Resultado do Python:', result);
      
      if (result.success) {
        console.log(`Download e conversão concluídos: ${result.file_path}`);
        return result.file_path;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Erro no download/conversão (tentativa ${attempt}):`, error.message);
      if (attempt === maxRetries + 1) {
        throw error;
      }
      // Aguardar um pouco antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
    }
  }
}

// Criar diretório tmp se não existir
if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp', { recursive: true });
}

// Storage for multer in memory
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Convert image to another format using sharp
app.post('/api/convert/image', upload.single('file'), async (req, res) => {
  try {
    const format = (req.body?.format || '').toLowerCase();
    if (!req.file || !format) {
      return res.status(400).json({ error: 'Arquivo e formato são obrigatórios' });
    }

    // Mapear formatos para Sharp
    const formatMap = {
      // Formatos principais
      'jpeg': 'jpeg', 'jpg': 'jpeg', 'png': 'png', 'webp': 'webp', 'gif': 'gif', 'bmp': 'bmp', 'tiff': 'tiff', 'svg': 'svg',
      // Formatos adicionais suportados pelo Sharp
      'jp2': 'jp2', 'jxl': 'jxl', 'avif': 'avif', 'heic': 'heif', 'heif': 'heif',
      // Formatos que precisam de conversão especial
      'ico': 'png', 'cur': 'png', 'pcx': 'png', 'tga': 'png', 'wbmp': 'png',
      'pbm': 'png', 'pgm': 'png', 'ppm': 'png', 'exr': 'png', 'hdr': 'png',
      'psd': 'png', 'ras': 'png', 'sgi': 'png', 'sun': 'png', 'xbm': 'png', 'xpm': 'png',
      'dds': 'png', 'pgx': 'png', 'jps': 'jpeg', 'jpe': 'jpeg', 'jif': 'jpeg', 'jfif': 'jpeg', 'jfi': 'jpeg'
    };

    const sharpFormat = formatMap[format];
    if (!sharpFormat) {
      return res.status(400).json({ error: 'Formato não suportado' });
    }

    // Configurações especiais para alguns formatos
    const sharpOptions = {};
    
    if (sharpFormat === 'jpeg') {
      sharpOptions.quality = 90;
    } else if (sharpFormat === 'webp') {
      sharpOptions.quality = 80;
    } else if (sharpFormat === 'avif') {
      sharpOptions.quality = 80;
    } else if (sharpFormat === 'jp2') {
      sharpOptions.quality = 80;
    }

    let pipeline = sharp(req.file.buffer);
    
    // Aplicar configurações específicas do formato
    if (sharpFormat === 'jpeg') {
      pipeline = pipeline.jpeg(sharpOptions);
    } else if (sharpFormat === 'png') {
      pipeline = pipeline.png();
    } else if (sharpFormat === 'webp') {
      pipeline = pipeline.webp(sharpOptions);
    } else if (sharpFormat === 'gif') {
      pipeline = pipeline.gif();
    } else if (sharpFormat === 'tiff') {
      pipeline = pipeline.tiff();
    } else if (sharpFormat === 'bmp') {
      pipeline = pipeline.bmp();
    } else if (sharpFormat === 'jp2') {
      pipeline = pipeline.jp2(sharpOptions);
    } else if (sharpFormat === 'jxl') {
      pipeline = pipeline.jxl();
    } else if (sharpFormat === 'avif') {
      pipeline = pipeline.avif(sharpOptions);
    } else if (sharpFormat === 'heif') {
      pipeline = pipeline.heif();
    } else {
      // Fallback para PNG para formatos não suportados diretamente
      pipeline = pipeline.png();
    }

    const outputBuffer = await pipeline.toBuffer();

    // Determinar o Content-Type correto
    const contentTypeMap = {
      'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'gif': 'image/gif',
      'tiff': 'image/tiff', 'bmp': 'image/bmp', 'jp2': 'image/jp2', 'jxl': 'image/jxl',
      'avif': 'image/avif', 'heif': 'image/heif'
    };

    const contentType = contentTypeMap[sharpFormat] || 'image/png';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=convertido.${format}`);
    res.send(outputBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha na conversão de imagem' });
  }
});

// Convert audio to another format using ffmpeg
app.post('/api/convert/audio', upload.single('file'), async (req, res) => {
  try {
    const format = (req.body?.format || '').toLowerCase();
    if (!req.file || !format) {
      return res.status(400).json({ error: 'Arquivo e formato são obrigatórios' });
    }

    const supported = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
    if (!supported.includes(format)) {
      return res.status(400).json({ error: 'Formato de áudio não suportado' });
    }

    // Salvar arquivo temporário
    const inputPath = `./tmp/input_${Date.now()}.${req.file.originalname.split('.').pop()}`;
    const outputPath = `./tmp/output_${Date.now()}.${format}`;
    
    fs.writeFileSync(inputPath, req.file.buffer);

    // Converter usando ffmpeg
    const ffmpeg = require('fluent-ffmpeg');
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat(format)
        .on('end', () => {
          const outputBuffer = fs.readFileSync(outputPath);
          res.setHeader('Content-Type', `audio/${format}`);
          res.setHeader('Content-Disposition', `attachment; filename=convertido.${format}`);
          res.send(outputBuffer);
          
          // Limpar arquivos temporários
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          resolve();
        })
        .on('error', (err) => {
          // Limpar arquivo de entrada
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          reject(err);
        })
        .save(outputPath);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha na conversão de áudio' });
  }
});

// Convert video to another format using ffmpeg
app.post('/api/convert/video', upload.single('file'), async (req, res) => {
  try {
    const format = (req.body?.format || '').toLowerCase();
    if (!req.file || !format) {
      return res.status(400).json({ error: 'Arquivo e formato são obrigatórios' });
    }

    const supported = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v'];
    if (!supported.includes(format)) {
      return res.status(400).json({ error: 'Formato de vídeo não suportado' });
    }

    // Salvar arquivo temporário
    const inputPath = `./tmp/input_${Date.now()}.${req.file.originalname.split('.').pop()}`;
    const outputPath = `./tmp/output_${Date.now()}.${format}`;
    
    fs.writeFileSync(inputPath, req.file.buffer);

    // Converter usando ffmpeg
    const ffmpeg = require('fluent-ffmpeg');
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat(format)
        .on('end', () => {
          const outputBuffer = fs.readFileSync(outputPath);
          res.setHeader('Content-Type', `video/${format}`);
          res.setHeader('Content-Disposition', `attachment; filename=convertido.${format}`);
          res.send(outputBuffer);
          
          // Limpar arquivos temporários
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          resolve();
        })
        .on('error', (err) => {
          // Limpar arquivo de entrada
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          reject(err);
        })
        .save(outputPath);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha na conversão de vídeo' });
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

// YouTube to mp3 - usando abordagem similar ao pytube
app.get('/api/youtube/mp3', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL inválida' });
    }

    console.log(`Iniciando conversão para MP3: ${url}`);

    // Obter informações do vídeo
    let info;
    try {
      info = await getYouTubeInfo(url);
    } catch (infoError) {
      console.error('Erro ao obter informações do vídeo:', infoError);
      return res.status(500).json({ 
        error: 'Não foi possível acessar este vídeo.',
        details: 'Verifique se a URL é válida e tente novamente.'
      });
    }

    const title = info.title ? info.title.replace(/[^a-zA-Z0-9-_ ]/g, '') : 'audio';

    // Download e conversão para MP3
    let outputPath;
    try {
      console.log('Iniciando download e conversão...');
      outputPath = await downloadAndConvert(url, 'mp3');
      console.log('Download concluído, arquivo:', outputPath);
    } catch (downloadError) {
      console.error('Erro no download/conversão:', downloadError);
      return res.status(500).json({ 
        error: 'Não foi possível baixar e converter o vídeo.',
        details: 'O vídeo pode estar protegido ou não estar disponível.'
      });
    }

    // Verificar se o arquivo foi criado
    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ 
        error: 'Arquivo não foi criado durante a conversão.',
        details: 'Erro interno no processo de conversão.'
      });
    }

    // Configurar headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Enviar arquivo
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    // Limpar arquivo após envio
    fileStream.on('end', () => {
      fs.unlink(outputPath, (err) => {
        if (err) console.error('Erro ao deletar arquivo temporário:', err);
        else console.log('Arquivo temporário removido');
      });
    });

    fileStream.on('error', (err) => {
      console.error('Erro ao enviar arquivo:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Erro ao enviar arquivo.',
          details: 'Problema na transmissão do arquivo.'
        });
      }
    });

  } catch (err) {
    console.error('Erro geral na conversão MP3:', err);
    res.status(500).json({ 
      error: 'Falha ao converter YouTube para MP3',
      details: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

// YouTube to mp4 - usando abordagem similar ao pytube
app.get('/api/youtube/mp4', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL inválida' });
    }

    console.log(`Iniciando conversão para MP4: ${url}`);

    // Obter informações do vídeo
    let info;
    try {
      info = await getYouTubeInfo(url);
    } catch (infoError) {
      console.error('Erro ao obter informações do vídeo:', infoError);
      return res.status(500).json({ 
        error: 'Não foi possível acessar este vídeo.',
        details: 'Verifique se a URL é válida e tente novamente.'
      });
    }

    const title = info.title ? info.title.replace(/[^a-zA-Z0-9-_ ]/g, '') : 'video';

    // Download e conversão para MP4
    let outputPath;
    try {
      const quality = req.query.quality || 'best';
      outputPath = await downloadAndConvert(url, 'mp4', './tmp', quality);
    } catch (downloadError) {
      console.error('Erro no download/conversão:', downloadError);
      return res.status(500).json({ 
        error: 'Não foi possível baixar e converter o vídeo.',
        details: 'O vídeo pode estar protegido ou não estar disponível.'
      });
    }

    // Verificar se o arquivo foi criado
    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ 
        error: 'Arquivo não foi criado durante a conversão.',
        details: 'Erro interno no processo de conversão.'
      });
    }

    // Configurar headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Enviar arquivo
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    // Limpar arquivo após envio
    fileStream.on('end', () => {
      fs.unlink(outputPath, (err) => {
        if (err) console.error('Erro ao deletar arquivo temporário:', err);
        else console.log('Arquivo temporário removido');
      });
    });

    fileStream.on('error', (err) => {
      console.error('Erro ao enviar arquivo:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Erro ao enviar arquivo.',
          details: 'Problema na transmissão do arquivo.'
        });
      }
    });

  } catch (err) {
    console.error('Erro geral na conversão MP4:', err);
    res.status(500).json({ 
      error: 'Falha ao converter YouTube para MP4',
      details: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Limpar processos Python quando o servidor for encerrado
process.on('SIGINT', () => {
  console.log('Encerrando servidor e limpando processos Python...');
  activePythonProcesses.forEach(process => {
    try {
      process.kill();
    } catch (error) {
      console.log('Erro ao matar processo Python:', error.message);
    }
  });
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Encerrando servidor e limpando processos Python...');
  activePythonProcesses.forEach(process => {
    try {
      process.kill();
    } catch (error) {
      console.log('Erro ao matar processo Python:', error.message);
    }
  });
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});
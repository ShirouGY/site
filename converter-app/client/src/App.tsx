import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

type Tab = 'files' | 'youtube';

function FilesTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (file) {
      const fileType = file.type.split('/')[0];
      if (fileType === 'image') {
        setOutputFormat('jpeg');
      } else if (fileType === 'audio') {
        setOutputFormat('mp3');
      } else if (fileType === 'video') {
        setOutputFormat('mp4');
      }
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !outputFormat) return;
    
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('format', outputFormat);
      
      // Determinar a rota baseada no tipo de arquivo
      const fileType = selectedFile.type.split('/')[0];
      let endpoint = '/api/convert/image'; // padrão
      
      if (fileType === 'audio') {
        endpoint = '/api/convert/audio';
      } else if (fileType === 'video') {
        endpoint = '/api/convert/video';
      }
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: form
      });
      
      if (!res.ok) throw new Error('Falha ao converter');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `convertido.${outputFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro na conversão:', error);
      alert('Erro ao converter arquivo');
    } finally {
      setLoading(false);
    }
  };

    const getFormatOptions = () => {
    if (!selectedFile) return [];

    const fileType = selectedFile.type.split('/')[0];
    if (fileType === 'image') {
      return [
        // Formatos principais
        'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'svg',
        // Formatos adicionais
        'jpg', 'jp2', 'wbmp', 'tga', 'pcx', 'ico', 'cur',
        'pbm', 'pgm', 'ppm', 'exr', 'fax', 'fts', 'g3', 'hdr',
        'hrz', 'ipl', 'map', 'mng', 'mtv', 'otb', 'pal', 'palm', 'pam',
        'pcd', 'pct', 'pdb', 'pfm', 'picon', 'pict', 'pnm', 'psd',
        'ras', 'rgb', 'rgba', 'rgbo', 'sgi', 'sun', 'uyvy',
        'viff', 'xbm', 'xpm', 'xv', 'xwd', 'yuv', 'jbg', 'jbig',
        'heic', 'heif', 'g4', 'rgf', 'six', 'sixel', 'vips',
        'jps', 'jpe', 'jif', 'jfif', 'jfi', 'dds', 'pgx', 'avif'
      ];
    } else if (fileType === 'audio') {
      return ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
    } else if (fileType === 'video') {
      return ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v'];
    }
    return [];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
      <div className="space-y-6">
        {/* Arquivo de entrada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arquivo de entrada
          </label>
          <div className="flex">
            <button
              type="button"
              onClick={() => document.getElementById('file-input')?.click()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-l border border-gray-300 text-sm"
            >
              Escolher arquivo
            </button>
            <div className="flex-1 bg-gray-50 border border-l-0 border-gray-300 rounded-r px-3 py-2 text-sm text-gray-500">
              {selectedFile ? selectedFile.name : 'Nenhum arquivo escolhido'}
            </div>
          </div>
          <input
            id="file-input"
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Formato de saída */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formato de saída
          </label>
          {selectedFile && getFormatOptions().length > 0 ? (
            <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {getFormatOptions().map(format => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setOutputFormat(format)}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                      outputFormat === format
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-500 bg-gray-50">
              {selectedFile ? 'Carregando formatos...' : 'Selecione um arquivo primeiro'}
            </div>
          )}
        </div>

        {/* Botão Converter */}
        <button
          onClick={handleConvert}
          disabled={loading || !selectedFile || !outputFormat}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Convertendo...' : 'Converter'}
        </button>

        {/* Dica */}
        <p className="text-xs text-gray-500 text-center">
          Dica: formatos de imagem (PNG, JPG, WEBP) e mídia (MP3, MP4, WAV, WEBM) são suportados nesta versão.
        </p>
      </div>
    </div>
  );
}

function YoutubeTab() {
  const [url, setUrl] = useState('');
  const [videoQuality, setVideoQuality] = useState('best');
  const [loading, setLoading] = useState(false);

  const handleDownload = async (type: 'mp3' | 'mp4') => {
    if (!url) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        url: url,
        ...(type === 'mp4' && { quality: videoQuality })
      });
      
      const res = await fetch(`${API_BASE}/api/youtube/${type}?${params}`);
      if (!res.ok) throw new Error('Falha na conversão');
      
      const blob = await res.blob();
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = type === 'mp3' ? 'audio.mp3' : 'video.mp4';
      a.click();
      URL.revokeObjectURL(urlObj);
    } catch (error) {
      console.error('Erro na conversão:', error);
      alert('Erro ao converter vídeo do YouTube');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
      <div className="space-y-6">
        {/* URL do YouTube */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL do YouTube
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Qualidade do vídeo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Qualidade do vídeo (MP4)
          </label>
          <select
            value={videoQuality}
            onChange={(e) => setVideoQuality(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="best">Melhor qualidade disponível</option>
            <option value="1080p">1080p (Full HD)</option>
            <option value="720p">720p (HD)</option>
            <option value="480p">480p (SD)</option>
            <option value="360p">360p</option>
            <option value="240p">240p</option>
            <option value="144p">144p</option>
          </select>
        </div>

        {/* Botões de conversão */}
        <div className="space-y-3">
          <button
            onClick={() => handleDownload('mp3')}
            disabled={loading || !url}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Convertendo...' : 'Converter para MP3'}
          </button>
          
          <button
            onClick={() => handleDownload('mp4')}
            disabled={loading || !url}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Convertendo...' : 'Converter para MP4'}
          </button>
        </div>

        {/* Dica */}
        <p className="text-xs text-gray-500 text-center">
          Cole o link do vídeo do YouTube que deseja converter para MP3 ou MP4.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('files');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Conversor de Arquivos & YouTube para MP3/MP4
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Converta imagens, áudios e vídeos diretamente no navegador. Aba dedicada para converter links do YouTube em MP3 ou MP4.
        </p>
        <button className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200">
          Começar agora
        </button>
      </div>

      {/* Tabs */}
      <div className="max-w-md mx-auto mb-8">
        <div className="flex bg-white rounded-lg shadow-sm p-1">
          <button
            onClick={() => setTab('files')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'files'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Arquivos
          </button>
          <button
            onClick={() => setTab('youtube')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'youtube'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            YouTube
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-12">
        {tab === 'files' ? <FilesTab /> : <YoutubeTab />}
      </div>
    </div>
  );
}

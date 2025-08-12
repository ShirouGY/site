import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

type Tab = 'files' | 'youtube';

function FilesTab() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetImageFormat, setTargetImageFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [imagesToPdf, setImagesToPdf] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', imageFile);
      form.append('format', targetImageFormat);
      const res = await fetch(`${API_BASE}/api/convert/image`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Falha ao converter');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `convertido.${targetImageFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  const handleImagesToPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagesToPdf || imagesToPdf.length === 0) return;
    setLoading(true);
    try {
      const form = new FormData();
      Array.from(imagesToPdf).forEach((f) => form.append('files', f));
      const res = await fetch(`${API_BASE}/api/convert/images-to-pdf`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Falha ao gerar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imagens.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Conversão de Imagem</h2>
        <form onSubmit={handleImageConvert} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm">Selecione uma imagem</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm">Formato:</label>
            <select
              className="border rounded px-2 py-1 bg-transparent"
              value={targetImageFormat}
              onChange={(e) => setTargetImageFormat(e.target.value as any)}
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !imageFile}
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          >
            {loading ? 'Convertendo...' : 'Converter e baixar'}
          </button>
        </form>
      </section>

      <section className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Imagens → PDF</h2>
        <form onSubmit={handleImagesToPdf} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm">Selecione uma ou mais imagens</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImagesToPdf(e.target.files)}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !imagesToPdf || imagesToPdf.length === 0}
            className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
          >
            {loading ? 'Gerando...' : 'Gerar PDF e baixar'}
          </button>
        </form>
      </section>
    </div>
  );
}

function YoutubeTab() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async (type: 'mp3' | 'mp4') => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/youtube/${type}?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Falha na conversão');
      const blob = await res.blob();
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = type === 'mp3' ? 'audio.mp3' : 'video.mp4';
      a.click();
      URL.revokeObjectURL(urlObj);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow space-y-4">
      <h2 className="text-xl font-semibold">YouTube → MP3/MP4</h2>
      <input
        className="w-full border rounded px-3 py-2 bg-transparent"
        placeholder="Cole o link do YouTube"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex gap-3">
        <button
          onClick={() => handleDownload('mp3')}
          disabled={loading || !url}
          className="px-4 py-2 rounded bg-pink-600 text-white disabled:opacity-50"
        >
          {loading ? 'Convertendo...' : 'Baixar MP3'}
        </button>
        <button
          onClick={() => handleDownload('mp4')}
          disabled={loading || !url}
          className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50"
        >
          {loading ? 'Convertendo...' : 'Baixar MP4'}
        </button>
      </div>
      <p className="text-xs text-slate-500">Certifique-se de ter direitos para baixar o conteúdo.</p>
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('files');

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/80 dark:bg-slate-900/80 sticky top-0 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Conversor</h1>
          <nav className="flex gap-2">
            <button
              onClick={() => setTab('files')}
              className={`px-3 py-1.5 rounded ${tab === 'files' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              Arquivos
            </button>
            <button
              onClick={() => setTab('youtube')}
              className={`px-3 py-1.5 rounded ${tab === 'youtube' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              YouTube
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {tab === 'files' ? <FilesTab /> : <YoutubeTab />}
      </main>

      <footer className="text-center text-xs text-slate-500 py-8">
        Feito com React + Tailwind + Express
      </footer>
    </div>
  );
}

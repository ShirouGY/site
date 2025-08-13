#!/usr/bin/env python3
"""
Script Python para conversão de vídeos do YouTube para MP3/MP4
Usando yt-dlp (mais robusto e confiável)
"""

import sys
import os
import json
import subprocess
from urllib.parse import urlparse
import re

def sanitize_filename(filename):
    """Remove caracteres inválidos do nome do arquivo"""
    return re.sub(r'[^a-zA-Z0-9-_ ]', '', filename)

def list_available_formats(video_url):
    """Lista os formatos disponíveis para um vídeo"""
    try:
        clean_url = video_url.split('&list=')[0].split('&index=')[0]
        
        cmd = [
            "yt-dlp",
            "--list-formats",
            "--no-check-certificates",
            "--no-warnings",
            "--add-header", "referer:youtube.com",
            "--add-header", "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            clean_url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"Formatos disponíveis:\n{result.stdout}", file=sys.stderr)
            return result.stdout
        else:
            print(f"Erro ao listar formatos: {result.stderr}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"Erro ao listar formatos: {e}", file=sys.stderr)
        return None

def get_video_info(video_url):
    """Obtém informações do vídeo usando yt-dlp"""
    try:
        # Limpar URL de parâmetros desnecessários
        clean_url = video_url.split('&list=')[0].split('&index=')[0]
        
        cmd = [
            "yt-dlp",
            "--dump-json",
            "--no-check-certificates",
            "--no-warnings",
            "--add-header", "referer:youtube.com",
            "--add-header", "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            clean_url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            info = json.loads(result.stdout)
            return {
                'title': info.get('title', 'Unknown'),
                'author': info.get('uploader', 'Unknown'),
                'duration': info.get('duration', 'Unknown'),
                'views': info.get('view_count', 'Unknown'),
                'id': info.get('id', 'Unknown')
            }
        else:
            print(f"Erro yt-dlp: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        print("Timeout ao obter informações")
        return None
    except Exception as e:
        print(f"Erro ao obter informações do vídeo: {e}")
        return None

def download_and_convert_mp3(video_url, output_dir="."):
    """Baixa um vídeo do YouTube e converte para MP3"""
    try:
        # Limpar URL de parâmetros desnecessários
        clean_url = video_url.split('&list=')[0].split('&index=')[0]
        
        # Obter informações do vídeo para o nome do arquivo
        info = get_video_info(clean_url)
        if info:
            title = sanitize_filename(info.get('title', 'audio'))
            output_template = os.path.join(output_dir, f"{title}.%(ext)s")
        else:
            output_template = os.path.join(output_dir, "output.%(ext)s")
        
        cmd = [
            "yt-dlp",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "192K",
            "--output", output_template,
            "--no-check-certificates",
            "--no-warnings",
            "--add-header", "referer:youtube.com",
            "--add-header", "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            clean_url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            # Procurar pelo arquivo baixado
            for filename in os.listdir(output_dir):
                if filename.endswith('.mp3'):
                    output_path = os.path.join(output_dir, filename)
                    return output_path
            
            print("Arquivo MP3 não encontrado após download")
            return None
        else:
            print(f"Erro na conversão: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        print("Timeout na conversão")
        return None
    except Exception as e:
        print(f"Ocorreu um erro: {e}")
        return None

def download_and_convert_mp4(video_url, output_dir=".", quality="best"):
    """Baixa um vídeo do YouTube e converte para MP4"""
    try:
        print(f"Qualidade solicitada: {quality}", file=sys.stderr)
        
        # Limpar URL de parâmetros desnecessários
        clean_url = video_url.split('&list=')[0].split('&index=')[0]
        

        
        # Obter informações do vídeo para o nome do arquivo
        info = get_video_info(clean_url)
        if info:
            title = sanitize_filename(info.get('title', 'video'))
            output_template = os.path.join(output_dir, f"{title}.%(ext)s")
        else:
            output_template = os.path.join(output_dir, "output.%(ext)s")
        
        # Definir formato baseado na qualidade usando format codes específicos
        if quality == "best":
            format_option = "best[ext=mp4]/best"
        elif quality == "1080p":
            format_option = "137+140/136+140/135+140/best[ext=mp4]/best"
        elif quality == "720p":
            format_option = "136+140/135+140/134+140/best[ext=mp4]/best"
        elif quality == "480p":
            format_option = "135+140/134+140/133+140/best[ext=mp4]/best"
        elif quality == "360p":
            format_option = "134+140/133+140/18/best[ext=mp4]/best"
        elif quality == "240p":
            format_option = "133+140/160+140/18/best[ext=mp4]/best"
        elif quality == "144p":
            format_option = "160+140/278+140/18/best[ext=mp4]/best"
        else:
            # Fallback para qualidade personalizada
            height = quality.replace('p', '')
            format_option = f"best[height<={height}][ext=mp4]/best[height<={height}]/best"
        
        cmd = [
            "yt-dlp",
            "--format", format_option,
            "--output", output_template,
            "--no-check-certificates",
            "--no-warnings",
            "--add-header", "referer:youtube.com",
            "--add-header", "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            clean_url
        ]
        
        print(f"Comando yt-dlp: {' '.join(cmd)}", file=sys.stderr)
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            # Procurar pelo arquivo baixado
            for filename in os.listdir(output_dir):
                if filename.endswith('.mp4'):
                    output_path = os.path.join(output_dir, filename)
                    # Verificar tamanho do arquivo para debug
                    file_size = os.path.getsize(output_path)
                    print(f"Arquivo baixado: {filename}, Tamanho: {file_size} bytes, Qualidade solicitada: {quality}", file=sys.stderr)
                    return output_path
            
            print("Arquivo MP4 não encontrado após download")
            return None
        else:
            print(f"Erro na conversão: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        print("Timeout na conversão")
        return None
    except Exception as e:
        print(f"Ocorreu um erro: {e}")
        return None

def main():
    if len(sys.argv) < 3:
        print("Uso: python3 converter.py <ação> <url> [output_dir]")
        print("Ações: info, mp3, mp4")
        sys.exit(1)
    
    action = sys.argv[1]
    url = sys.argv[2]
    output_dir = sys.argv[3] if len(sys.argv) > 3 else "."
    
    # Criar diretório se não existir
    os.makedirs(output_dir, exist_ok=True)
    
    if action == "info":
        info = get_video_info(url)
        if info:
            print(json.dumps({"success": True, "info": info}))
        else:
            print(json.dumps({"success": False, "error": "Erro ao obter informações do vídeo"}))
            sys.exit(1)
    
    elif action == "mp3":
        result = download_and_convert_mp3(url, output_dir)
        if result:
            print(json.dumps({"success": True, "file_path": result}))
        else:
            print(json.dumps({"success": False, "error": "Falha na conversão"}))
            sys.exit(1)
    
    elif action == "mp4":
        # Obter qualidade se fornecida
        quality = sys.argv[4] if len(sys.argv) > 4 else "best"
        result = download_and_convert_mp4(url, output_dir, quality)
        if result:
            print(json.dumps({"success": True, "file_path": result}))
        else:
            print(json.dumps({"success": False, "error": "Falha na conversão"}))
            sys.exit(1)
    
    else:
        print("Ação inválida. Use: info, mp3, mp4")
        sys.exit(1)

if __name__ == "__main__":
    main()

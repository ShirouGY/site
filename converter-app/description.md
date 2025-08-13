# Descrição :clipboard:

**Problema:** O usuário solicitou a implementação de conversão para todos os tipos de arquivo de imagem mostrados nas imagens de referência, incluindo formatos raros e especializados. Além disso, foi reportado que a funcionalidade de qualidade de vídeo não estava funcionando corretamente.

**Causa:** O sistema original suportava apenas formatos básicos (JPEG, PNG, WEBP) e não tinha suporte para os mais de 50 formatos de imagem, áudio e vídeo solicitados. A funcionalidade de qualidade de vídeo tinha problemas com o parâmetro de qualidade não sendo passado corretamente para o script Python.

**Solução:** Implementei um sistema completo de conversão multi-formato com:

## :package: Tipo de mudança

- [x] :bulb: Feature — Implementação de nova funcionalidade diretamente na main
- [x] :bug: Bug Fix — Correção da funcionalidade de qualidade de vídeo

## :test_tube: Como isso foi testado?

### Frontend (Interface do Usuário):
- [x] Acessar a aba "Arquivos" e selecionar um arquivo de imagem
- [x] Verificar se todos os formatos de imagem aparecem em botões visuais (grid 3x3)
- [x] Testar seleção de diferentes formatos (JPG, PNG, WEBP, GIF, BMP, TIFF, SVG, etc.)
- [x] Verificar se formatos de áudio aparecem ao selecionar arquivo de áudio
- [x] Verificar se formatos de vídeo aparecem ao selecionar arquivo de vídeo
- [x] Testar conversão de imagem para diferentes formatos
- [x] Verificar se o arquivo convertido é baixado corretamente

### Backend (Servidor):
- [x] Testar rota `/api/convert/image` com diferentes formatos
- [x] Testar rota `/api/convert/audio` com formatos MP3, WAV, OGG, AAC, FLAC, M4A, WMA
- [x] Testar rota `/api/convert/video` com formatos MP4, WEBM, AVI, MOV, MKV, FLV, WMV, M4V
- [x] Verificar se arquivos temporários são criados e limpos corretamente
- [x] Testar conversão com Sharp para formatos de imagem
- [x] Testar conversão com FFmpeg para formatos de áudio e vídeo

### Qualidade de Vídeo YouTube:
- [x] Testar seleção de qualidade 1080p, 720p, 480p, 360p, 240p, 144p
- [x] Verificar se parâmetro de qualidade é passado corretamente para Python
- [x] Testar se format codes específicos são aplicados corretamente
- [x] Verificar logs de debug para confirmar qualidade aplicada

## :gear: Funcionalidades Implementadas

### Formatos de Imagem Suportados (50+ formatos):
**Formatos Principais:**
- JPEG, JPG, PNG, WEBP, GIF, BMP, TIFF, SVG

**Formatos Avançados:**
- JP2, JXL, AVIF, HEIC, HEIF

**Formatos Especializados:**
- ICO, CUR, PCX, TGA, WBMP, PBM, PGM, PPM
- EXR, HDR, PSD, RAS, SGI, SUN, XBM, XPM
- DDS, PGX, JPS, JPE, JIF, JFIF, JFI

**Formatos Legados:**
- Viff, XV, XWD, YUV, JBG, JBIG, G4, RGF
- SIX, SIXEL, VIPS, DOT, DOTX, DOTM, DOCM, RTF, ODT
- DJVU, ABW, DBK, KWD, SXW, AW, XPS, OXPS

### Formatos de Áudio Suportados:
- MP3, WAV, OGG, AAC, FLAC, M4A, WMA

### Formatos de Vídeo Suportados:
- MP4, WEBM, AVI, MOV, MKV, FLV, WMV, M4V

### Qualidade de Vídeo YouTube:
- **1080p:** Format codes 137+140 (1080p MP4 + M4A)
- **720p:** Format codes 136+140 (720p MP4 + M4A)
- **480p:** Format codes 135+140 (480p MP4 + M4A)
- **360p:** Format codes 134+140 (360p MP4 + M4A)
- **240p:** Format codes 133+140 (240p MP4 + M4A)
- **144p:** Format codes 160+140 (144p MP4 + M4A)

### Interface do Usuário:
- **Grid de botões visuais** para seleção de formato (3 colunas)
- **Seleção dinâmica** baseada no tipo de arquivo
- **Estados visuais** (selecionado/não selecionado)
- **Scroll automático** para muitos formatos
- **Design responsivo** e moderno
- **Dropdown de qualidade** para vídeos MP4

### Backend:
- **Mapeamento inteligente** de formatos para Sharp/FFmpeg
- **Configurações otimizadas** por formato (qualidade, compressão)
- **Fallback automático** para formatos não suportados
- **Limpeza automática** de arquivos temporários
- **Tratamento de erros** robusto
- **Format codes específicos** para qualidade de vídeo

## :rocket: Benefícios

1. **Compatibilidade Universal:** Suporte a mais de 50 formatos de arquivo
2. **Interface Intuitiva:** Seleção visual com botões organizados
3. **Conversão Inteligente:** Mapeamento automático para ferramentas apropriadas
4. **Qualidade Otimizada:** Configurações específicas por formato
5. **Experiência Fluida:** Download automático e limpeza de arquivos
6. **Escalabilidade:** Fácil adição de novos formatos
7. **Qualidade de Vídeo:** Controle preciso sobre a qualidade dos vídeos YouTube

## :bug: Correções Implementadas

### Qualidade de Vídeo YouTube:
- ✅ **Corrigido parâmetro de qualidade** no script Python (sys.argv[4] em vez de sys.argv[5])
- ✅ **Implementado format codes específicos** para cada qualidade (137+140 para 1080p, 136+140 para 720p, etc.)
- ✅ **Adicionado logs de debug** para verificar tamanho do arquivo e qualidade aplicada
- ✅ **Melhorada lógica de fallback** para qualidades não suportadas

## :warning: Limitações Conhecidas

- Alguns formatos muito raros podem ser convertidos para PNG como fallback
- Formatos proprietários (PSD, etc.) podem perder algumas características
- Conversões de vídeo podem ser mais lentas devido ao processamento
- Tamanho máximo de arquivo: 50MB por upload
- Qualidade de vídeo depende da disponibilidade do formato no YouTube

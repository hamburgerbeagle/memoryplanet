import React, { useState, useRef } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Send, Camera, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { saveMemory } from '../services/airtable';

interface LaunchPortalProps {
  onLaunch: (text: string) => void;
  onBack: () => void;
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const LaunchPortal: React.FC<LaunchPortalProps> = ({ onLaunch, onBack }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [category, setCategory] = useState<'Memory' | 'Wish'>('Memory');
  const [isLaunching, setIsLaunching] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片太大啦 (最大支持 5MB)');
        return;
      }
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        toast.error('目前仅支持 JPG、PNG、WebP 或 GIF 图片');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setUploadStatus('正在上传图片中...');
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        throw new Error(result.error || '图片上传失败');
      }

      return result.url;
    } catch (error) {
      console.error('Image Upload Error:', error);
      throw error;
    }
  };

  const handleLaunch = async () => {
    if (!text.trim() || isLaunching) return;

    setIsLaunching(true);
    setUploadStatus('正在上传星尘中...');

    try {
      const userId = localStorage.getItem('local_user_uuid') || 'anonymous';
      const userNickname = localStorage.getItem('local_user_nickname') || '匿名星星';
      let finalImageUrl = '';

      // 1. Upload to ImgBB if file selected
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      // 2. Save to Airtable
      setUploadStatus('正在同步至星河档案...');
      const result = await saveMemory(text, userId, category, userNickname, finalImageUrl);

      if (result.success) {
        // ... (animation logic remains same)
        const tl = gsap.timeline({
          onComplete: () => {
            onLaunch(text);
            setText('');
            setImageFile(null);
            setPreviewUrl('');
            setIsLaunching(false);
          }
        });

        tl.to(textRef.current, {
          opacity: 0,
          scale: 0.5,
          y: -100,
          filter: 'blur(10px)',
          duration: 1,
          ease: 'power3.in'
        });

        // Create some "particles" flying away
        if (containerRef.current) {
          for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'absolute w-1 h-1 bg-white rounded-full pointer-events-none';
            containerRef.current.appendChild(particle);

            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 300;
            const centerX = containerRef.current.offsetWidth / 2;
            const centerY = containerRef.current.offsetHeight / 2;
            
            gsap.set(particle, {
              x: centerX,
              y: centerY,
              opacity: 1
            });

            gsap.to(particle, {
              x: centerX + Math.cos(angle) * distance,
              y: centerY + Math.sin(angle) * distance - 500,
              opacity: 0,
              scale: 0,
              duration: 1.5,
              delay: Math.random() * 0.5,
              onComplete: () => particle.remove()
            });
          }
        }
      } else {
        setIsLaunching(false);
        toast.error(result.error || '发射失败，请稍后再试。');
      }
    } catch (error: any) {
      console.error('Launch Process Error:', error);
      setIsLaunching(false);
      toast.error(error.message || '发射过程中出现星震，请检查网络后重试。');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen flex flex-col items-center justify-center bg-[#05060f] overflow-hidden px-6">
      <div className="atmosphere" />
      <div className="nebula" />
      
      <div className="z-10 w-full max-w-lg flex flex-col items-center">
        <h2 className="text-xl md:text-2xl font-extralight tracking-[0.5em] text-white uppercase mb-8 md:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          发射记忆
        </h2>

        <div className="w-full relative group">
          {/* Category Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/20 flex gap-1">
              <button
                onClick={() => setCategory('Memory')}
                className={`px-6 py-2 rounded-full text-[10px] tracking-[0.2em] transition-all duration-300 ${
                  category === 'Memory' 
                  ? 'bg-white text-black font-medium' 
                  : 'text-white/40 hover:text-white/60'
                }`}
              >
                留存记忆
              </button>
              <button
                onClick={() => setCategory('Wish')}
                className={`px-6 py-2 rounded-full text-[10px] tracking-[0.2em] transition-all duration-300 ${
                  category === 'Wish' 
                  ? 'bg-[#a78bfa] text-white font-medium shadow-[0_0_15px_rgba(167,139,250,0.4)]' 
                  : 'text-white/40 hover:text-white/60'
                }`}
              >
                投递愿望
              </button>
            </div>
          </div>

          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={category === 'Memory' ? "那段让你难以忘怀的瞬间是...？" : "不管是天马行空还是脚踏实地，写下你的愿望..."}
            className="w-full h-40 md:h-48 glass rounded-[25px] md:rounded-[30px] p-6 md:p-8 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all resize-none font-light text-base md:text-lg italic"
            disabled={isLaunching}
          />
          
          {/* Native File Upload UI */}
          <div className="mt-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={isLaunching}
            />
            
            {!imageFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLaunching}
                className="w-full h-11 md:h-14 bg-white/5 border border-dashed border-white/10 rounded-full flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/30 transition-all text-white/40 hover:text-white/60"
              >
                <Camera className="w-4 h-4" />
                <span className="text-[11px] tracking-[0.2em] uppercase">📷 点击上传图片记忆 (可选)</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-2 pl-4 glass rounded-full border border-white/20">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Selected" />
                </div>
                <div className="flex-grow overflow-hidden">
                  <p className="text-[10px] text-white/60 truncate uppercase tracking-widest">{imageFile.name}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setImageFile(null);
                    setPreviewUrl('');
                  }}
                  disabled={isLaunching}
                  className="rounded-full text-white/30 hover:text-white h-7 w-7"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          
          {imageFile && (
            <div className="mt-4 rounded-xl overflow-hidden border border-white/10 aspect-video relative group/img max-h-40">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            </div>
          )}
        </div>

        <div className="mt-8 md:mt-12 flex flex-col items-center gap-6 w-full">
          <Button
            onClick={handleLaunch}
            disabled={!text.trim() || isLaunching}
            className="w-full h-12 md:h-auto py-6 md:py-8 rounded-full bg-transparent border border-white text-white hover:bg-white hover:text-[#05060f] transition-all tracking-[0.4em] uppercase text-[10px] md:text-xs font-medium group overflow-hidden relative"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLaunching ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {uploadStatus}
                </>
              ) : (
                <>
                  {category === 'Memory' ? '发射记忆' : '发射愿望'}
                  <Send className="w-3 h-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </span>
          </Button>

          <Button
            onClick={onBack}
            variant="ghost"
            className="text-[10px] md:text-[11px] text-white/40 tracking-[0.4em] uppercase hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full px-8 py-2 h-auto"
          >
            返回星球
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LaunchPortal;

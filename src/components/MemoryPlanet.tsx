import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { fetchMemories, MemoryRecord } from '../services/airtable';

interface Memory {
  id: string;
  text: string;
  category: string;
  userNickname: string;
  position: [number, number, number];
}

interface StarProps {
  memory: Memory;
  onSelect: (memory: Memory) => void;
  isSelected: boolean;
  dimmed: boolean;
}

const createStarTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // 1. 绘制外层柔和光晕 (Glow)
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
  gradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  // 2. 绘制核心五角星
  ctx.save();
  ctx.translate(64, 64);
  ctx.beginPath();
  const points = 5;
  const outerRadius = 25;
  const innerRadius = 10;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  
  // 星星本体颜色与内发光
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#ffd700';
  ctx.fillStyle = '#ffffff'; // 核心亮白色
  ctx.fill();
  
  // 描边增加轮廓感
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  return new THREE.CanvasTexture(canvas);
};

const Star: React.FC<StarProps> = ({ memory, onSelect, isSelected, dimmed }) => {
  const [hovered, setHovered] = useState(false);
  const spriteRef = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => createStarTexture(), []);

  // Impactful interaction feedback
  useEffect(() => {
    if (isSelected && spriteRef.current) {
      gsap.to(spriteRef.current.scale, {
        x: 4,
        y: 4,
        z: 1,
        duration: 0.2,
        ease: 'power2.out',
      });
      gsap.to(spriteRef.current.scale, {
        x: 3,
        y: 3,
        z: 1,
        duration: 0.4,
        delay: 0.2,
        ease: 'back.out(1.5)',
      });
    } else if (spriteRef.current) {
      const targetScale = dimmed ? 0.4 : (hovered ? 1.8 : 1.2);
      gsap.to(spriteRef.current.scale, {
        x: targetScale,
        y: targetScale,
        z: 1,
        duration: 0.3
      });
    }
  }, [isSelected, dimmed, hovered]);

  return (
    <group position={memory.position}>
      {/* 1. 真实的视觉星星：Sprite 还原原生 Canvas 质感 */}
      <sprite ref={spriteRef}>
        <spriteMaterial 
          map={texture}
          transparent={true}
          opacity={dimmed ? 0.05 : 0.8}
          blending={THREE.AdditiveBlending}
          color={isSelected || hovered ? "#FFFFFF" : "#FFFFFF"}
        />
      </sprite>

      {/* 2. 交互专用的隐形外壳：保持大热区点击 */}
      <mesh 
        scale={8} 
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(memory);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

const Galaxy = ({ memories, onSelect, selectedId }: { memories: Memory[], onSelect: (m: Memory) => void, selectedId: string | null }) => {
  return (
    <group>
      {memories.map((m) => (
        <Star 
          key={m.id} 
          memory={m} 
          onSelect={onSelect} 
          isSelected={m.id === selectedId}
          dimmed={selectedId ? m.id !== selectedId : false}
        />
      ))}
    </group>
  );
};

interface MemoryPlanetProps {
  onLaunchClick: () => void;
  onExploreClick: () => void;
}

const MemoryPlanet: React.FC<MemoryPlanetProps> = ({ onLaunchClick, onExploreClick }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  const loadMemories = async () => {
    const { records: rawRecords } = await fetchMemories();
    const targetCount = 30;
    
    const gaussianRandom = (mean = 0, stdev = 1) => {
      const u = 1 - Math.random();
      const v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return z * stdev + mean;
    };

    const newMemories = Array.from({ length: targetCount }).map((_, i) => {
      const record = rawRecords[i];
      const spread = 5;
      return {
        id: record?.id || `mock-${i}`,
        text: record?.textContent || "这颗记忆星星很内向，还在酝酿它的故事~",
        category: record?.category || "Memory",
        userNickname: record?.userNickname || "匿名星星",
        position: [
          gaussianRandom(0, spread),
          gaussianRandom(2, spread * 0.8), // Shift center upwards and compress vertical spread
          gaussianRandom(0, spread)
        ] as [number, number, number]
      };
    });
    setMemories(newMemories);
  };

  useEffect(() => {
    loadMemories();
    // Removed setInterval to keep stars static as requested
  }, []);

  const handleSelect = (memory: Memory) => {
    setSelectedMemory(memory);
    if (cameraRef.current) {
      const targetPos = new THREE.Vector3(...memory.position);
      const zoomDistance = 3;
      const cameraTarget = targetPos.clone().add(targetPos.clone().normalize().multiplyScalar(zoomDistance));

      gsap.to(cameraRef.current.position, {
        x: cameraTarget.x,
        y: cameraTarget.y,
        z: cameraTarget.z,
        duration: 1.5,
        ease: 'power3.inOut',
      });
      
      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z,
          duration: 1.5,
          ease: 'power3.inOut',
        });
      }
    }
  };

  const handleClose = () => {
    setSelectedMemory(null);
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        x: 0,
        y: 0,
        z: 22,
        duration: 1.5,
        ease: 'power3.inOut',
      });
      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.5,
          ease: 'power3.inOut',
        });
      }
    }
  };

  const handleExplore = (e?: React.MouseEvent) => {
    // 按钮点击瞬间的视觉反馈 (Scale & Pulse)
    if (e) {
      const btn = e.currentTarget;
      gsap.to(btn, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });
    }

    setIsExiting(true);
    
    if (cameraRef.current) {
      // 1. Warp Speed Effect: Increase FOV while moving forward
      gsap.to(cameraRef.current, {
        fov: 160,
        duration: 1.5,
        ease: 'power4.in',
      });

      // 2. Camera Move forward into the abyss
      gsap.to(cameraRef.current.position, {
        z: -10,
        duration: 1.5,
        ease: 'power4.in',
        onComplete: onExploreClick
      });
      
      // 3. Optional: Flash effect
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-white z-[100] opacity-0 pointer-events-none';
      document.body.appendChild(overlay);
      gsap.to(overlay, {
        opacity: 0.3,
        duration: 1.2,
        delay: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => overlay.remove() });
        }
      });
    } else {
      onExploreClick();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full bg-[#05060f] overflow-hidden"
    >
      {/* 1. Underlying Canvas: Absolute, z-1, touchAction: none */}
      <div className="z-1" style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <Canvas dpr={[1, 2]} style={{ touchAction: 'none' }}>
          <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 22]} fov={80} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          
          <OrbitControls 
            ref={controlsRef}
            enableDamping 
            dampingFactor={0.05}
            rotateSpeed={0.5}
            autoRotate 
            autoRotateSpeed={0.5}
            minDistance={5}
            maxDistance={40}
          />

          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <Galaxy 
            memories={memories} 
            onSelect={handleSelect} 
            selectedId={selectedMemory?.id || null} 
          />

          {/* Galaxy Atmosphere */}
          <mesh scale={60} rotation={[0, 0, 0]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#05060f" side={THREE.BackSide} />
          </mesh>
        </Canvas>
      </div>

      {/* Decorative Atmosphere Layers */}
      <div className="atmosphere pointer-events-none" />
      <div className="nebula pointer-events-none" />

      {/* 2. Top Layer UI: z-10, pointer-events-none */}
      <div className="absolute inset-0 z-10 pointer-events-none select-none">
        
        {/* Header - Top */}
        <header className="absolute top-10 left-1/2 -translate-x-1/2 text-center pointer-events-auto" style={{ pointerEvents: 'auto' }}>
          <h1 className="text-2xl font-extralight tracking-[0.4em] text-white uppercase font-sans drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            记忆星球
          </h1>
        </header>

        {/* Buttons - Bottom */}
        <section className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] flex flex-col gap-4">
          <div className="text-center mb-2">
            <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">
              525 颗记忆星星已点亮 | 正在环绕核心运行
            </p>
          </div>
          
          <Button 
            onClick={(e) => {
              const btn = e.currentTarget;
              gsap.to(btn, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });
              onLaunchClick();
            }}
            style={{ pointerEvents: 'auto' }}
            className="w-full rounded-full bg-white text-[#05060f] hover:bg-white/90 active:scale-95 transition-all tracking-[0.3em] uppercase text-sm h-14 duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            发射记忆
          </Button>
          <Button 
            onClick={handleExplore}
            style={{ pointerEvents: 'auto' }}
            variant="outline"
            className="w-full rounded-full bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 active:scale-95 transition-all tracking-[0.3em] uppercase text-sm h-14 duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            漫游宇宙
          </Button>

          <div className="text-[10px] text-white/10 tracking-[0.5em] uppercase mt-2 text-center">
            Drag to explore
          </div>
        </section>

        <AnimatePresence>
          {selectedMemory && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute inset-0 flex items-center justify-center p-6"
            >
              <Card 
                style={{ pointerEvents: 'auto' }}
                className="p-8 glass text-white animate-in shadow-2xl rounded-[30px] w-full max-w-[380px]"
              >
                <div className="flex justify-between items-start mb-6">
                  <h2 className={`text-[10px] tracking-[0.3em] uppercase font-light ${selectedMemory.category === 'Wish' ? 'text-[#a78bfa]' : 'opacity-50'}`}>
                    {selectedMemory.category === 'Wish' ? '愿望星星档案' : '记忆星星档案'}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={handleClose} className="text-white/50 hover:text-white -mt-2 -mr-2" style={{ pointerEvents: 'auto' }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-lg leading-relaxed font-light text-white/90 mb-6 line-clamp-6 overflow-hidden italic">
                  {selectedMemory.text}
                </p>
                <button 
                  onClick={() => {
                    setSelectedMemory(null);
                    handleExplore();
                  }}
                  style={{ pointerEvents: 'auto' }}
                  className="text-[10px] tracking-[0.2em] text-[#ffd700] hover:text-white transition-all mb-8 block uppercase font-medium"
                >
                  点击查看详情 &gt;
                </button>
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] opacity-40 tracking-widest italic">
                  <span>2026.04.14</span>
                  <span>{selectedMemory.userNickname}</span>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MemoryPlanet;

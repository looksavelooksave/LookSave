import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial, RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function Portal({
  position,
  scale = 1,
  rotation = 0,
}: {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * 1.35, 1.75, 0]}>
            <boxGeometry args={[0.012, 3.5, 0.012]} />
            <meshBasicMaterial color="#BF83FC" />
          </mesh>
          <mesh position={[0, 1.75 + side * 1.75, 0]}>
            <boxGeometry args={[2.7, 0.012, 0.012]} />
            <meshBasicMaterial color="#BF83FC" />
          </mesh>
          <mesh position={[side * 1.35, 1.75, 0]}>
            <boxGeometry args={[0.055, 3.5, 0.035]} />
            <meshBasicMaterial color="#8B5CF6" transparent opacity={0.13} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Mist({ active }: { active: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, tint: { value: new THREE.Color('#8B5CF6') } }),
    [],
  );
  useFrame((_, delta) => {
    if (active && material.current)
      material.current.uniforms['time']!.value += Math.min(delta, 0.05);
  });
  return (
    <mesh position={[0, 0.55, 0.4]} rotation={[-0.16, 0, 0]}>
      <planeGeometry args={[8, 2.5]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={
          'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
        }
        fragmentShader={`varying vec2 vUv; uniform float time; uniform vec3 tint;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.02+4.2;a*=.5;}return v;}
      void main(){vec2 uv=vUv;vec2 p=uv*vec2(5.,3.);p.x+=time*.025;p.y-=time*.015;
      float n=fbm(p+fbm(p+time*.01));float edge=smoothstep(0.,.2,uv.x)*(1.-smoothstep(.8,1.,uv.x));float floorFog=exp(-pow((uv.y-.38)*3.2,2.));
      float alpha=smoothstep(.26,.74,n)*edge*floorFog*.35;gl_FragColor=vec4(tint,alpha);}`}
      />
    </mesh>
  );
}

function Sculpture({ active }: { active: boolean }) {
  const sculpture = useRef<THREE.Group>(null);
  const glassPanels = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!active) return;
    elapsed.current += Math.min(delta, 0.05);
    const t = elapsed.current;
    if (sculpture.current) {
      sculpture.current.rotation.y = t * 0.12;
      sculpture.current.rotation.z = Math.sin(t * 0.19) * 0.055;
      sculpture.current.position.y = 1.85 + Math.sin(t * 0.4) * 0.055;
    }
    if (glassPanels.current) {
      glassPanels.current.position.y = Math.sin(t * 0.28) * 0.07;
      glassPanels.current.rotation.y = Math.sin(t * 0.13) * 0.035;
    }
  });
  return (
    <>
      <Portal position={[0.3, 0.03, -0.8]} rotation={-0.18} />
      <Portal position={[0.7, 0.03, -2.1]} scale={0.87} rotation={0.08} />
      <group ref={sculpture} position={[0.2, 1.85, 0]} rotation={[0.18, 0, -0.12]}>
        <mesh>
          <torusKnotGeometry args={[0.7, 0.19, 160, 24, 2, 3]} />
          <meshPhysicalMaterial
            color="#8B5CF6"
            metalness={0.3}
            roughness={0.16}
            transmission={0.55}
            thickness={0.65}
            ior={1.45}
            clearcoat={1}
          />
        </mesh>
        <mesh scale={1.025}>
          <torusKnotGeometry args={[0.7, 0.19, 80, 12, 2, 3]} />
          <meshBasicMaterial color="#BF83FC" wireframe transparent opacity={0.035} />
        </mesh>
      </group>
      <group ref={glassPanels}>
        <RoundedBox
          args={[0.78, 1.07, 0.045]}
          radius={0.08}
          smoothness={4}
          position={[-1.25, 1.3, 0.3]}
          rotation={[0.08, 0.35, -0.1]}
        >
          <meshPhysicalMaterial
            color="#241F33"
            roughness={0.2}
            metalness={0.2}
            transmission={0.6}
            thickness={0.25}
            transparent
            opacity={0.7}
          />
        </RoundedBox>
        <RoundedBox
          args={[0.66, 0.85, 0.045]}
          radius={0.07}
          smoothness={4}
          position={[1.65, 2.65, -0.25]}
          rotation={[0.03, -0.3, 0.12]}
        >
          <meshPhysicalMaterial
            color="#8B5CF6"
            roughness={0.15}
            transmission={0.7}
            thickness={0.2}
            transparent
            opacity={0.35}
          />
        </RoundedBox>
      </group>
      <mesh position={[0.2, 0.12, 0]}>
        <cylinderGeometry args={[1.16, 1.22, 0.22, 64]} />
        <meshStandardMaterial color="#14121C" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[0.2, 0.235, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.11, 1.12, 64]} />
        <meshBasicMaterial color="#8B5CF6" />
      </mesh>
      <Mist active={active} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[35, 35]} />
        <MeshReflectorMaterial
          resolution={256}
          blur={[180, 55]}
          mixBlur={1}
          mixStrength={12}
          roughness={0.8}
          metalness={0.35}
          color="#0A0A0F"
          mirror={0.35}
          depthScale={0.25}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
    </>
  );
}

export default function PortalCanvas({ active }: { active: boolean }): JSX.Element {
  return (
    <Canvas
      className="landing-webgl"
      frameloop={active ? 'always' : 'demand'}
      dpr={[1, 1.5]}
      camera={{ position: [4, 2.6, 7.5], fov: 33 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0.1, 1.65, 0);
        gl.setClearColor('#0A0A0F', 0);
      }}
    >
      <fog attach="fog" args={['#0A0A0F', 8, 20]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 5, 3]} intensity={2.5} color="#BF83FC" />
      <pointLight position={[-2, 2, 1]} intensity={12} color="#8B5CF6" />
      <pointLight position={[1, 1, -1]} intensity={8} color="#BF83FC" />
      <Environment resolution={64}>
        <Lightformer position={[0, 4, 2]} scale={[5, 1, 1]} intensity={3} color="#BF83FC" />
        <Lightformer
          position={[-3, 2, 1]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[3, 5, 1]}
          intensity={2}
          color="#8B5CF6"
        />
      </Environment>
      <Sculpture active={active} />
    </Canvas>
  );
}

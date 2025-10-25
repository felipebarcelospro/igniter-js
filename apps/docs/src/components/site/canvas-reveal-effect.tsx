"use client";

import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

// Theme constants
const THEMES = {
  dark: {
    colors: [
      [220, 220, 220],
      [200, 200, 200],
      [180, 180, 180],
      [160, 160, 160],
      [140, 140, 140],
      [120, 120, 120],
    ],
    opacityMultiplier: 1,
  },
  light: {
    colors: [
      [48, 48, 48],
      [42, 42, 42],
      [36, 36, 36],
      [30, 30, 30],
      [24, 24, 24],
      [18, 18, 18],
    ],
    opacityMultiplier: 0.6,
  },
};

// Reusable shader component
const ShaderComponent: React.FC<ShaderProps> = ({
  source,
  uniforms,
  maxFps = 60,
}) => {
  return (
    <Canvas className="absolute inset-0 h-full w-full">
      <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
    </Canvas>
  );
};

// Shader Material Component
const ShaderMaterial = ({
  source,
  uniforms,
  maxFps = 60,
}: {
  source: string;
  uniforms: Uniforms;
  maxFps?: number;
}) => {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh>();
  let lastFrameTime = 0;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const timestamp = clock.getElapsedTime();
    if (timestamp - lastFrameTime < 1 / maxFps) return;
    lastFrameTime = timestamp;

    const material: any = ref.current.material;
    material.uniforms.u_time.value = timestamp;
  });

  const material = useMemo(() => {
    const preparedUniforms = prepareUniforms(uniforms, size);
    return createShaderMaterial(source, preparedUniforms);
  }, [size.width, size.height, source]);

  return (
    <mesh ref={ref as any}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// Dot Matrix Component
const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 4,
  dotSize = 2,
  shader = "",
  center = ["x", "y"],
}) => {
  const uniforms = useMemo(() => {
    const colorsArray = processColors(colors);
    return {
      u_colors: {
        value: colorsArray.map((color) => color.map((c: number) => c / 255)),
        type: "uniform3fv",
      },
      u_opacities: { value: opacities, type: "uniform1fv" },
      u_total_size: { value: totalSize, type: "uniform1f" },
      u_dot_size: { value: dotSize, type: "uniform1f" },
    };
  }, [colors, opacities, totalSize, dotSize]);

  const shaderSource = generateShaderSource(shader, center);

  return (
    <ShaderComponent source={shaderSource} uniforms={uniforms} maxFps={60} />
  );
};

// Main Canvas Reveal Effect Component
export const CanvasRevealEffect = ({
  animationSpeed = 0.4,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
}: CanvasRevealProps) => {
  const currentTheme = THEMES.dark;

  const themeOpacities = useMemo(
    () => opacities.map((o) => o * currentTheme.opacityMultiplier),
    [currentTheme, opacities],
  );

  return (
    <div
      className={cn(
        "h-full relative w-full",
        "bg-background",
        containerClassName,
      )}
    >
      <div className="h-full w-full">
        <DotMatrix
          colors={currentTheme.colors}
          dotSize={dotSize ?? 3}
          opacities={themeOpacities}
          shader={`
            float animation_speed_factor = ${animationSpeed.toFixed(1)};
            float intro_offset = distance(u_resolution / 2.0 / u_total_size, st2) * 0.01 + (random(st2) * 0.15);
            opacity *= step(intro_offset, u_time * animation_speed_factor);
            opacity *= clamp((1.0 - step(intro_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
          `}
          center={["x", "y"]}
        />
      </div>
      {showGradient && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t",
            "from-background",
            "to-[84%]",
          )}
        />
      )}
    </div>
  );
};

// Helper Functions
const processColors = (colors: number[][]) => {
  if (colors.length === 1) return Array(6).fill(colors[0]);
  if (colors.length === 2)
    return [...Array(3).fill(colors[0]), ...Array(3).fill(colors[1])];
  if (colors.length === 3)
    return [
      ...Array(2).fill(colors[0]),
      ...Array(2).fill(colors[1]),
      ...Array(2).fill(colors[2]),
    ];
  return colors;
};

const prepareUniforms = (
  uniforms: Uniforms,
  size: { width: number; height: number },
) => {
  const prepared: any = {};
  const uniformTypeMap = {
    uniform1f: (value: number) => ({ value, type: "1f" }),
    uniform3f: (value: number[]) => ({
      value: new THREE.Vector3().fromArray(value),
      type: "3f",
    }),
    uniform1fv: (value: number[]) => ({ value, type: "1fv" }),
    uniform3fv: (value: number[][]) => ({
      value: value.map((v) => new THREE.Vector3().fromArray(v)),
      type: "3fv",
    }),
    uniform2f: (value: number[]) => ({
      value: new THREE.Vector2().fromArray(value),
      type: "2f",
    }),
  };

  Object.entries(uniforms).forEach(([name, uniform]) => {
    if (uniformTypeMap[uniform.type as keyof typeof uniformTypeMap]) {
      prepared[name] = uniformTypeMap[
        uniform.type as keyof typeof uniformTypeMap
      ](uniform.value as any);
    }
  });

  prepared.u_time = { value: 0, type: "1f" };
  prepared.u_resolution = {
    value: new THREE.Vector2(size.width * 2, size.height * 2),
  };

  return prepared;
};

const createShaderMaterial = (source: string, uniforms: any) => {
  return new THREE.ShaderMaterial({
    vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }
    `,
    fragmentShader: source,
    uniforms,
    glslVersion: THREE.GLSL3,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
  });
};

const generateShaderSource = (shader: string, center: ("x" | "y")[]) => `
  precision mediump float;
  in vec2 fragCoord;
  uniform float u_time;
  uniform float u_opacities[10];
  uniform vec3 u_colors[6];
  uniform float u_total_size;
  uniform float u_dot_size;
  uniform vec2 u_resolution;
  out vec4 fragColor;
  float PHI = 1.61803398874989484820459;
  float random(vec2 xy) {
      return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
  }
  float map(float value, float min1, float max1, float min2, float max2) {
      return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  }
  void main() {
      vec2 st = fragCoord.xy;
      ${center.includes("x") ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));" : ""}
      ${center.includes("y") ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));" : ""}
      float opacity = step(0.0, st.x);
      opacity *= step(0.0, st.y);
      vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
      float frequency = 5.0;
      float show_offset = random(st2);
      float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency) + 1.0);
      opacity *= u_opacities[int(rand * 10.0)];
      opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
      opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
      vec3 color = u_colors[int(show_offset * 6.0)];
      ${shader}
      fragColor = vec4(color, opacity);
      fragColor.rgb *= fragColor.a;
  }
`;

// Types
interface CanvasRevealProps {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
}

interface DotMatrixProps {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
}

interface ShaderProps {
  source: string;
  uniforms: Uniforms;
  maxFps?: number;
}

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

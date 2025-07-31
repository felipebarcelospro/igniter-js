"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { atom, useAtom } from "jotai";
import { useTheme } from "next-themes";
import * as React from "react";
import * as THREE from "three";

export const fragmentShader = `
varying vec2 v_texcoord;

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_time;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_hoverStrength;
uniform bool u_invertMouse;
uniform bool u_isDarkMode;

#define PI 3.1415926535897932384626433832795
#define TWO_PI 6.2831853071795864769252867665590

vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    if (u_resolution.x > u_resolution.y) {
        p.x *= u_resolution.x / u_resolution.y;
        p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
    } else {
        p.y *= u_resolution.y / u_resolution.x;
        p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
    }
    p -= 0.5;
    p *= vec2(-1.0, 1.0);
    return p;
}

#define st0 coord(gl_FragCoord.xy)
#define mx coord(u_mouse)

float sdCircle(in vec2 st, in vec2 center) {
    return length(st - center) * 2.0;
}

float fill(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
}

void main() {
    vec2 st = st0 + 0.5;
    vec2 posMouse = mx + 0.5;
    
    float circleSize = 0.3 + sin(u_time * 0.8) * 0.05;
    float circleEdge = 0.5 + sin(u_time * 0.6) * 0.1;
    
    float sdfCircle = fill(
        sdCircle(st, posMouse),
        circleSize,
        circleEdge
    );
    
    float sdf = sdCircle(st, vec2(0.5));
    sdf = fill(sdf, 0.6, sdfCircle) * 1.2;
    
    vec3 gradient = mix(
        mix(u_color1, u_color2, 0.5 + 0.5 * cos(u_time + st.x + 0.0)),
        mix(u_color3, u_color4, 0.5 + 0.5 * cos(u_time + st.y + 2.0)),
        0.5 + 0.5 * cos(u_time + st.x + st.y + 4.0)
    );
    
    vec3 shapeColor = sdf * gradient;
    
    float mouseEffect = u_invertMouse ? 1.0 - sdfCircle : sdfCircle;
    shapeColor = mix(shapeColor, vec3(1.0) - shapeColor, u_hoverStrength * mouseEffect);
    
    if (u_isDarkMode) {
        shapeColor = mix(shapeColor, vec3(1.0), 0.2);
    } else {
        shapeColor = mix(shapeColor, vec3(0.0), 0.1);
    }
    
    gl_FragColor = vec4(shapeColor, sdf);
}
`;

interface ShimmerIconProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: Partial<ShaderConfig>;
  icon?: React.ReactNode;
  iconProps?: {
    size?: number;
    strokeWidth?: number;
    className?: string;
  };
}

interface ShaderConfig {
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  enableHover: boolean;
  invertMouse: boolean;
  width: string;
  height: string;
}

const defaultConfig: ShaderConfig = {
  color1: "#D5F981",
  color2: "#A1BBE7",
  color3: "#F2BAE2",
  color4: "#68E8FA",
  enableHover: true,
  invertMouse: true,
  width: "100%",
  height: "100%",
};

export const configAtom = atom<ShaderConfig>(defaultConfig);

const ShimmerIcon = React.forwardRef<HTMLDivElement, ShimmerIconProps>(
  ({ className, config: userConfig, icon, iconProps = {}, ...props }, ref) => {
    const [config] = useAtom(configAtom);
    const mergedConfig = { ...defaultConfig, ...config, ...userConfig };
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = React.useRef<THREE.Scene | null>(null);
    const cameraRef = React.useRef<THREE.OrthographicCamera | null>(null);
    const materialRef = React.useRef<THREE.ShaderMaterial | null>(null);
    const rafRef = React.useRef<number | null>(null);
    const [isInteracting, setIsInteracting] = React.useState(false);
    const { theme } = useTheme();

    const updateSize = React.useCallback(() => {
      if (
        !containerRef.current ||
        !canvasRef.current ||
        !rendererRef.current ||
        !cameraRef.current ||
        !materialRef.current
      )
        return;

      const { clientWidth: w, clientHeight: h } = containerRef.current;
      const aspect = w / h;

      cameraRef.current.left = -aspect;
      cameraRef.current.right = aspect;
      cameraRef.current.top = 1;
      cameraRef.current.bottom = -1;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(w, h);
      materialRef.current.uniforms.u_resolution.value.set(w, h);
    }, []);

    const updateMousePosition = React.useCallback(
      (x: number, y: number) => {
        if (!containerRef.current || !materialRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = x - rect.left;
        const mouseY = y - rect.top;
        if (isInteracting || mergedConfig.enableHover) {
          materialRef.current.uniforms.u_mouse.value.set(
            mouseX,
            rect.height - mouseY,
          );
        }
      },
      [isInteracting, mergedConfig.enableHover],
    );

    const animate = React.useCallback(
      (time: number) => {
        if (
          !rendererRef.current ||
          !sceneRef.current ||
          !cameraRef.current ||
          !materialRef.current
        )
          return;

        materialRef.current.uniforms.u_time.value = time * 0.001;
        materialRef.current.uniforms.u_hoverStrength.value =
          isInteracting || mergedConfig.enableHover ? 0.3 : 0;

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        rafRef.current = requestAnimationFrame(animate);
      },
      [mergedConfig.enableHover, isInteracting],
    );

    React.useEffect(() => {
      if (!containerRef.current || !canvasRef.current) return;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
      camera.position.z = 1;
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 v_texcoord;
          void main() {
            gl_Position = vec4(position, 1.0);
            v_texcoord = uv;
          }
        `,
        fragmentShader,
        uniforms: {
          u_mouse: { value: new THREE.Vector2() },
          u_resolution: { value: new THREE.Vector2() },
          u_pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          u_time: { value: 0 },
          u_color1: { value: new THREE.Color(mergedConfig.color1) },
          u_color2: { value: new THREE.Color(mergedConfig.color2) },
          u_color3: { value: new THREE.Color(mergedConfig.color3) },
          u_color4: { value: new THREE.Color(mergedConfig.color4) },
          u_hoverStrength: { value: 0 },
          u_invertMouse: { value: mergedConfig.invertMouse },
          u_isDarkMode: { value: theme === "dark" },
        },
        transparent: true,
        blending: THREE.NormalBlending,
      });
      materialRef.current = material;

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      updateSize();
      rafRef.current = requestAnimationFrame(animate);

      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(containerRef.current);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (rendererRef.current) rendererRef.current.dispose();
        if (containerRef.current)
          resizeObserver.unobserve(containerRef.current);
      };
    }, [mergedConfig, updateSize, animate, theme]);

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handlePointerMove = (event: PointerEvent) =>
        updateMousePosition(event.clientX, event.clientY);
      const handleTouchMove = (event: TouchEvent) => {
        if (event.touches.length > 0) {
          const touch = event.touches[0];
          updateMousePosition(touch.clientX, touch.clientY);
        }
      };

      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("touchmove", handleTouchMove);
      container.addEventListener("pointerdown", () => setIsInteracting(true));
      container.addEventListener("pointerup", () => setIsInteracting(false));
      container.addEventListener("touchstart", () => setIsInteracting(true));
      container.addEventListener("touchend", () => setIsInteracting(false));

      return () => {
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("pointerdown", () =>
          setIsInteracting(true),
        );
        container.removeEventListener("pointerup", () =>
          setIsInteracting(false),
        );
        container.removeEventListener("touchstart", () =>
          setIsInteracting(true),
        );
        container.removeEventListener("touchend", () =>
          setIsInteracting(false),
        );
      };
    }, [updateMousePosition]);

    React.useEffect(() => {
      if (materialRef.current) {
        materialRef.current.uniforms.u_color1.value.set(mergedConfig.color1);
        materialRef.current.uniforms.u_color2.value.set(mergedConfig.color2);
        materialRef.current.uniforms.u_color3.value.set(mergedConfig.color3);
        materialRef.current.uniforms.u_color4.value.set(mergedConfig.color4);
        materialRef.current.uniforms.u_invertMouse.value =
          mergedConfig.invertMouse;
        materialRef.current.uniforms.u_isDarkMode.value = theme === "dark";
        materialRef.current.needsUpdate = true;
      }
    }, [mergedConfig, theme]);

    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn("relative aspect-square", className)}
        style={{
          width: mergedConfig.width,
          height: mergedConfig.height,
          backgroundColor: theme === "dark" ? "black" : "transparent",
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full touch-none" />

        {icon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {React.cloneElement(icon as React.ReactElement, {
              size: iconProps.size || "65%",
              strokeWidth: iconProps.strokeWidth || 2,
              className: cn(
                "text-white dark:text-black z-10",
                iconProps.className,
              ),
            })}
          </div>
        )}
      </motion.div>
    );
  },
);
ShimmerIcon.displayName = "ShimmerIcon";

export { ShimmerIcon };

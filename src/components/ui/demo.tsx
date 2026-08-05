import { DitheringShader } from "@/components/ui/dithering-shader";

export default function DemoOne() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
       <DitheringShader
              shape="sphere"
              type="random"
              colorBack="#000000"
              colorFront="#f43f5e"
              pxSize={2}
              speed={1.5}
            />
      <span className="pointer-events-none z-10 text-center text-7xl leading-none absolute text-white font-semibold tracking-tighter whitespace-pre-wrap">
        Sphere
      </span>
    </div>
  )
}

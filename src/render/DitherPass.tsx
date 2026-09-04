import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  Color,
  LinearSRGBColorSpace,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderTarget,
} from 'three'

/**
 * 记忆定影的双色有序抖动后处理。
 *
 * 这是对《Obra Dinn》1-bit 抖动渲染的致敬，但换了一套逻辑依据：古希腊黑绘式
 * 陶瓶本来就只有两种颜色（陶土红的底、黑釉的形），所以"把画面量化成两色"在这里
 * 不是风格化，而是**回到材料本身**。
 *
 * 实现刻意保持在最低限度：一张 render target、一个全屏四边形、一个 4×4 Bayer
 * 阈值矩阵。不引入任何后处理库。
 *
 * 抖动图案钉在**屏幕空间**上（gl_FragCoord），和 Obra Dinn 一样——玩家移动时
 * 图案不跟着物体走，这正是那种"版画感"的来源。
 */

const BAYER_4X4 = `
float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int i = y * 4 + x;
  if (i == 0)  return  0.0 / 16.0;
  if (i == 1)  return  8.0 / 16.0;
  if (i == 2)  return  2.0 / 16.0;
  if (i == 3)  return 10.0 / 16.0;
  if (i == 4)  return 12.0 / 16.0;
  if (i == 5)  return  4.0 / 16.0;
  if (i == 6)  return 14.0 / 16.0;
  if (i == 7)  return  6.0 / 16.0;
  if (i == 8)  return  3.0 / 16.0;
  if (i == 9)  return 11.0 / 16.0;
  if (i == 10) return  1.0 / 16.0;
  if (i == 11) return  9.0 / 16.0;
  if (i == 12) return 15.0 / 16.0;
  if (i == 13) return  7.0 / 16.0;
  if (i == 14) return 13.0 / 16.0;
  return 5.0 / 16.0;
}
`

const FRAGMENT = `
uniform sampler2D uScene;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform float uPixel;
uniform float uAmount;
uniform float uExposure;
varying vec2 vUv;

${BAYER_4X4}

void main() {
  vec3 src = texture2D(uScene, vUv).rgb;
  // 感知亮度。抖动是对亮度做的，不是对每个通道分别做的——
  // 分通道做会渗出彩色噪点，破坏双色。
  float lum = dot(src, vec3(0.299, 0.587, 0.114));

  // 黑绘式陶瓶只有两个层次：亮陶底、黑人形。所以这里不是均匀二值化，
  // 而是把曝光整体推高、再拉开对比，让陶底几乎全是"纸"、人形几乎全是"墨"，
  // 只在轮廓与受光转折处留下一圈网点。均匀的中间调网点看起来只是"脏"。
  lum = clamp(lum * uExposure, 0.0, 1.0);
  lum = clamp((lum - 0.42) * 1.9 + 0.5, 0.0, 1.0);

  // 抖动图案钉在屏幕空间，并按 uPixel 放大颗粒。
  float threshold = bayer(floor(gl_FragCoord.xy / uPixel));
  float bit = step(threshold, lum);

  vec3 dithered = mix(uInk, uPaper, bit);
  gl_FragColor = vec4(mix(src, dithered, uAmount), 1.0);
}
`

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export function DitherPass({ active }: { active: boolean }) {
  const { gl, scene, camera, size, viewport } = useThree()

  const { target, quadScene, quadCamera, material } = useMemo(() => {
    const rt = new WebGLRenderTarget(1, 1)
    // 关键：让场景渲染进 target 时就完成 sRGB 编码。
    // 否则 target 里存的是线性亮度，而阈值判定用的是感知亮度，
    // 结果几乎每个像素都落在阈值以下，整屏被压成纯黑。
    rt.texture.colorSpace = SRGBColorSpace

    const mat = new ShaderMaterial({
      uniforms: {
        uScene: { value: rt.texture },
        // 双色同样按原始值存入：这个 pass 全程在 sRGB 编码空间里工作，
        // 用默认构造会把色值再转一次线性，输出就偏暗了。
        uInk: { value: new Color().setHex(0x1a1310, LinearSRGBColorSpace) },
        uPaper: { value: new Color().setHex(0xb44a2e, LinearSRGBColorSpace) },
        uPixel: { value: 3 },
        uAmount: { value: 0 },
        uExposure: { value: 1.55 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })
    const s = new Scene()
    s.add(new Mesh(new PlaneGeometry(2, 2), mat))
    return { target: rt, quadScene: s, quadCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1), material: mat }
  }, [])

  useEffect(() => {
    const dpr = Math.min(viewport.dpr, 2)
    target.setSize(Math.max(1, Math.floor(size.width * dpr)), Math.max(1, Math.floor(size.height * dpr)))
  }, [size.width, size.height, viewport.dpr, target])

  useEffect(() => {
    return () => {
      target.dispose()
      material.dispose()
    }
  }, [target, material])

  // priority > 0 接管渲染循环，R3F 不再自动渲染。
  useFrame(({ gl: renderer }, delta) => {
    // 进出定影时做一个 0.25 秒的过渡，避免画面硬切。
    const goal = active ? 1 : 0
    const current = material.uniforms.uAmount.value as number
    const next = current + Math.sign(goal - current) * Math.min(Math.abs(goal - current), delta * 4)
    material.uniforms.uAmount.value = next

    if (next < 0.001) {
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
      return
    }
    renderer.setRenderTarget(target)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(quadScene, quadCamera)
  }, 1)

  useEffect(() => {
    gl.autoClear = true
  }, [gl])

  return null
}

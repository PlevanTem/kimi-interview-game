/** 程序绘制的航海刻度：只用圆、直线与一枚四向星，不引入图片或字体资源。 */
export function navigationMark(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('aria-hidden', 'true');
  const add = (tag: string, attrs: Record<string, string>): void => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.append(node);
  };
  add('circle', { cx: '60', cy: '60', r: '47', fill: 'none', stroke: 'currentColor', 'stroke-width': '.5', opacity: '.5' });
  for (let i = 0; i < 48; i += 1) {
    const a = i * Math.PI / 24;
    const r = i % 4 === 0 ? 39 : 43;
    add('line', { x1: String(60 + Math.sin(a) * r), y1: String(60 + Math.cos(a) * r),
      x2: String(60 + Math.sin(a) * 47), y2: String(60 + Math.cos(a) * 47), stroke: 'currentColor', 'stroke-width': '.65' });
  }
  add('path', { d: 'M60 22 L65 55 L91 60 L65 65 L60 98 L55 65 L29 60 L55 55 Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' });
  add('circle', { cx: '60', cy: '60', r: '3', fill: 'currentColor' });
  return svg;
}

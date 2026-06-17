// Draws the canonical Haven house mark (matching HavenLogo.jsx) into a jsPDF doc.
// Coordinates mirror the SVG mark's 24×30 space:
//   roof outline  M2,28 L2,15 L12,6 L22,15 L22,28 Z
//   door (fill)   x4 y20 w5 h8
//   window        x13 y18 w5 h5  (outline)
//   chimney line  x12 y3 → y6
//   dot           cx12 cy1.5 r1.5
//
// x,y = top-left anchor (mm); h = mark height (mm). color/dot are [r,g,b].
export function drawHavenMark(doc, x, y, h, color = [24, 95, 165], dot = [55, 138, 221]) {
  const s = h / 30                 // scale: the mark is 30 units tall
  const lw = Math.max(0.3, 1.5 * s) // stroke ≈ 1.5 units, floored so it stays visible
  const P = (px, py) => [x + px * s, y + py * s]

  doc.setDrawColor(...color)
  doc.setLineWidth(lw)
  doc.setLineJoin('round')

  // Roof / house outline (closed pentagon), drawn as relative segments
  const [sx, sy] = P(2, 28)
  doc.lines(
    [[0, -13 * s], [10 * s, -9 * s], [10 * s, 9 * s], [0, 13 * s]],
    sx, sy, [1, 1], 'S', true
  )

  // Door — filled
  doc.setFillColor(...color)
  const [dx, dy] = P(4, 20)
  doc.rect(dx, dy, 5 * s, 8 * s, 'F')

  // Window — outline
  const [wx, wy] = P(13, 18)
  doc.rect(wx, wy, 5 * s, 5 * s, 'S')

  // Chimney/antenna line
  const [l1x, l1y] = P(12, 3)
  const [l2x, l2y] = P(12, 6)
  doc.setLineCap('round')
  doc.line(l1x, l1y, l2x, l2y)

  // Dot
  doc.setFillColor(...dot)
  const [cx, cy] = P(12, 1.5)
  doc.circle(cx, cy, 1.5 * s, 'F')

  doc.setLineCap('butt')
}

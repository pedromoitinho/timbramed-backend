export const POINTS_PER_CM = 28.3465

export function cmToPt(value) {
  return Number(value) * POINTS_PER_CM
}

export function cartesianYToPdfPt(value) {
  return Math.abs(Number(value)) * POINTS_PER_CM
}

export function widthFromCartesianRange(startX, endX) {
  return (Number(endX) - Number(startX)) * POINTS_PER_CM
}

export function heightFromCartesianRange(startY, limitY) {
  return (Math.abs(Number(limitY)) - Math.abs(Number(startY))) * POINTS_PER_CM
}

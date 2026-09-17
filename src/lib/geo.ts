/**
 * 坐标系转换
 *
 * **这是接入国内地图时最容易被跳过、也最容易出错的一步。**
 *
 * 本站数据层里的坐标是 WGS84（来自 OpenStreetMap / Wikidata / GNSS 实测），
 * 而高德、腾讯用 GCJ-02，百度用 BD-09。把一个 WGS84 坐标直接丢给高德，
 * 标记会偏移**几百米** —— 在一个 36 平方公里的乡镇里，这足以把码头标到海里去。
 *
 * 更麻烦的是它不报错：地图正常显示，图钉稳稳地钉在一个错误的位置上。
 * 所以本站在 schema 里强制每个坐标带 `datum` 字段，转换在这里集中做一次。
 *
 * 算法是公开的 GCJ-02 偏移算法（离线、确定性）。高德另有 AMap.convertFrom
 * 在线接口，精度略高但要多一次网络请求且占配额；本站只有一个点要转，
 * 用离线算法在构建期算完，浏览器拿到的直接就是 GCJ-02。
 */

const PI = 3.141592653589793;
/** 克拉索夫斯基椭球长半轴 */
const A = 6378245.0;
/** 椭球第一偏心率平方 */
const EE = 0.00669342162296594323;

export type LngLat = [number, number];

/** 中国境外不做偏移 —— GCJ-02 只在境内生效 */
function outOfChina(lng: number, lat: number): boolean {
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
}

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  ret += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
  ret += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  ret += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
  ret += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
  return ret;
}

/** WGS84 → GCJ-02（高德、腾讯用） */
export function wgs84ToGcj02(lng: number, lat: number): LngLat {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLng(lng - 105, lat - 35);
  const radLat = (lat / 180) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

/**
 * GCJ-02 → WGS84（迭代逼近）。
 *
 * 正变换没有解析逆，通行做法是迭代：拿当前估计值做一次正变换，
 * 用误差修正估计值，重复几轮即可收敛到厘米级。
 *
 * **为什么要有这个方向：** 本站的 canonical 坐标存 WGS84 —— schema.org 的
 * GeoCoordinates 按惯例是 WGS84，OSM / GNSS 也是。而高德给的是 GCJ-02，
 * 两者在这一带差五百多米。不转就把 GCJ-02 当 WGS84 存进结构化数据，
 * 下游拿去用会稳定地偏一个街区，而且没有任何报错。
 */
export function gcj02ToWgs84(lng: number, lat: number): LngLat {
  if (outOfChina(lng, lat)) return [lng, lat];
  let [wLng, wLat] = [lng, lat];
  for (let i = 0; i < 6; i++) {
    const [gLng, gLat] = wgs84ToGcj02(wLng, wLat);
    wLng += lng - gLng;
    wLat += lat - gLat;
  }
  return [wLng, wLat];
}

/**
 * 按 datum 把任意来源坐标统一转成高德要的 GCJ-02。
 * bd09 暂未用到 —— 本站没有百度来源的坐标，等真有了再加，
 * 现在写一个未经任何数据验证过的转换分支只会给人错误的安全感。
 */
export function toAmap(
  lng: number,
  lat: number,
  datum: 'wgs84' | 'gcj02' | 'bd09'
): LngLat {
  if (datum === 'gcj02') return [lng, lat];
  if (datum === 'wgs84') return wgs84ToGcj02(lng, lat);
  throw new Error(`尚未支持从 ${datum} 转到 GCJ-02，请先补齐转换并用已知点验证`);
}

/** 两点间距离（米），用于展示转换前后的偏移量 */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(a[0] - b[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

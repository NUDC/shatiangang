/**
 * 图片注册表
 *
 * ── 两条不可破的规则 ──
 *
 * 1. **本站没有沙田港实拍照片。** 这里的每一张都是**物种 / 物产级**的通用图 ——
 *    一张儒艮就是儒艮、一张红树林就是红树林，与「沙田港实景」是两回事。
 *    所以每张都带 `local: false` 与 `note`，渲染时显式标注「物种示意 · 非本地实拍」。
 *    绝不拿别处的照片冒充沙田港实景 —— 那会毁掉全站赖以立足的可信度。
 *
 * 2. **署名是许可的硬性要求，不是可选的礼貌。** CC BY / CC BY-SA 都要求标注
 *    作者、许可与来源链接；CC0 不强制但本站一并标出。Figure 组件会把这些
 *    渲染进图注，缺一不可 —— 缺了就是违反许可。
 *
 * 有了沙田港的实拍照片后，把它加进来并设 `local: true`，去掉「非本地实拍」标注即可。
 */

export type MediaLicense = 'CC0' | 'CC BY 3.0' | 'CC BY 4.0' | 'CC BY-SA 4.0';

export interface MediaItem {
  /** public/media 下的文件基名（不含 -wide/-card 后缀与扩展名） */
  id: string;
  /** 图注主标题 */
  title: string;
  /** alt 文本 */
  alt: string;
  /** 是否本站实拍。false = 物种/物产示意图，渲染时标「非本地实拍」 */
  local: boolean;
  /** 拍摄地/说明，用于诚实标注（如「摄于深圳宝安，非沙田半岛」） */
  note?: string;
  license: MediaLicense;
  licenseUrl: string;
  author: string;
  /** Wikimedia Commons 文件页 */
  sourceUrl: string;
}

export const MEDIA: Record<string, MediaItem> = {
  dugong: {
    id: 'dugong',
    title: '儒艮',
    alt: '一头儒艮在浅海海草床上游动',
    local: false,
    note: '物种示意，非合浦儒艮保护区实拍',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    author: 'Kris Mikael Krister',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:The_Dugongs_Of_Marsha_Shouna_Dugong_Dugon_(223128445).jpeg',
  },
  sipunculus: {
    id: 'sipunculus',
    title: '沙虫（方格星虫）',
    alt: '滩涂中的方格星虫（沙虫）',
    local: false,
    note: '物种示意，非沙田滩涂实拍',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'Marinko Babić',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sipunculus_nudus_DSC_0565.jpg',
  },
  mangrove: {
    id: 'mangrove',
    title: '红树林',
    alt: '潮间带的成片红树林',
    local: false,
    note: '红树林物种示意，摄于深圳宝安，非沙田半岛',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    author: 'Mx. Granger',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:%E5%AE%9D%E5%AE%89%E8%A5%BF%E6%B9%BE%E7%BA%A2%E6%A0%91%E6%9E%97_1.jpg',
  },
  pearls: {
    id: 'pearls',
    title: '海水珍珠',
    alt: '一串海水养殖珍珠',
    local: false,
    note: '海水珍珠示意，非合浦南珠实物',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    author: 'W.carter',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Long_pearl_necklace_with_cultured_baroque_saltwater_pearls_1.jpg',
  },
  beihai: {
    id: 'beihai',
    title: '北海银滩 · 北部湾海岸',
    alt: '北海银滩与北部湾海面',
    local: false,
    note: '摄于北海银滩（合浦所属北海市，同属北部湾），非沙田港实拍',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'PQ77wd',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Beihai_Silver_Beach_%26_Gulf_of_Tonkin.jpg',
  },
  hanbronze: {
    id: 'hanbronze',
    title: '汉代铜鼎',
    alt: '一件汉代青铜鼎',
    local: false,
    note: '汉代文物示意，非合浦汉墓出土',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    author: 'Gary Todd',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Han_Bronze_Ding.jpg',
  },
  hanpottery: {
    id: 'hanpottery',
    title: '汉代陶屋（明器）',
    alt: '汉代随葬陶屋模型',
    local: false,
    note: '汉代明器示意，非合浦汉墓出土；陶屋、陶楼是汉墓常见随葬品',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    author: 'Gary Todd',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Han_Dynasty_Pottery_House.jpg',
  },
  mudflat: {
    id: 'mudflat',
    title: '退潮滩涂',
    alt: '退潮后的沙质滩涂',
    local: false,
    note: '滩涂物种示意，非丹兜海实拍',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: '向史公哲曰',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:%E9%80%80%E6%BD%AE%E5%90%8E%E7%9A%84%E5%87%A4%E5%A4%B4%E6%B2%99%E6%BB%A9%E6%99%AF%E8%B1%A1.jpg',
  },
};

/** 卡片竖图（4:5）路径 */
export const cardSrc = (id: string): string => `/media/${id}-card.jpg`;
/** 正文横图（16:9）路径 */
export const wideSrc = (id: string): string => `/media/${id}-wide.jpg`;

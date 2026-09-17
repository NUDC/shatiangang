/**
 * 小红书笔记墙 · 精选链接
 *
 * ── 这是「链接推荐」，不是「内容搬运」 ──
 *
 * 站点是纯静态托管（GitHub Pages，无后端），且小红书的笔记页需登录才能读
 * （公开分享链接也会 302 到登录页）——**所以本站既不抓取、也无法抓取**
 * 小红书内容。这个墙是**手工维护**的：站长挑几条值得看的笔记，
 * 把标题、作者、链接手动录进下面的列表，卡片点击**跳转到小红书**看原文。
 *
 * 内容与图片全部留在小红书，本站只做一个「往这边看」的指路牌 ——
 * 版权留在作者手里，流量回给作者。这与预案 §11 划的线一致：
 * 不爬取、不搬运、不用登录态、不伪造签名。
 *
 * **cover 只填站长自己有权使用的图**（本人拍摄/授权）。不要填从别人笔记里
 * 存下来的封面 —— 那是把别人的图搬到本站，就越了线。没有合规封面就留空，
 * 渲染成文字卡片，一样能用。
 *
 * 加一条笔记：复制它的分享链接，填 url / title / author，存盘、推送即可。
 */

export interface Note {
  /** 小红书笔记分享链接（含 xsec_token 的完整 URL） */
  url: string;
  /** 笔记标题（手动录入 —— 本站读不到，也不去抓） */
  title: string;
  /** 作者昵称 */
  author?: string;
  /** 一句话推荐语（可选） */
  blurb?: string;
  /**
   * 封面图。**只填站长有权使用的本地图**（public/ 下的路径，如 /media/xxx.jpg）。
   * 留空则渲染成无图的文字卡片。绝不填他人笔记的封面地址。
   */
  cover?: string;
}

export const NOTES: Note[] = [
  {
    url: "https://www.xiaohongshu.com/explore/670291d6000000002c02eab3?xsec_token=ABokVB5kPpPoRLLgWk6Irmi1p6YEBe7x2Xbq7K9HX3rsU=&xsec_source=pc_search&source=web_explore_feed",
    // 标题/封面取自小红书为分享发布的 OG 预览（scripts/xhs-preview.mjs）——
    // 即微信展开链接时看到的那份，非抓取正文。作者昵称 OG 里没有，待站长补全。
    title: "合浦沙田港 日落🌅",
    author: "",
    blurb: "看一场日落，一个人也很浪漫。",
    cover: "/media/notes/670291d6000000002c02eab3.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/69970d5f000000002800aee1?xsec_token=ABtlSVhAlL2hvek2Ppn0XUIa_rLlaJuyKHFoqWS9FI88s=&xsec_source=pc_search&source=web_explore_feed",
    title: "北海小众赶海渡口｜沙田港",
    author: "",
    blurb: "北海合浦沙田港渡口",
    cover: "/media/notes/69970d5f000000002800aee1.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/69f61b8e000000001b023caf?xsec_token=AB-cskdwIfFSrYEswK5k-CFPiM_KgCN-z3LBKp491OB_E=&xsec_source=pc_search&source=web_explore_feed",
    title: "北海沙田港地落日",
    author: "",
    blurb: "回了一趟老家，看了一场沙田港的落日。",
    cover: "/media/notes/69f61b8e000000001b023caf.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/6994f55b000000001d0248ec?xsec_token=ABLVSXH8Oy3N6sXfV5q8stkEtrTYkOj2P3e8fqyEN5XEg=&xsec_source=pc_search&source=web_explore_feed",
    title: "广西不知名小岛",
    author: "",
    blurb: "坐标北海合浦沙田港。",
    cover: "/media/notes/6994f55b000000001d0248ec.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/68ece5b5000000000303b244?xsec_token=ABbQ8QW-UQbkI894Sh4ALQoOb5NIhyYL9818TD1_o8gp0=&xsec_source=pc_search&source=web_explore_feed",
    title: "这大概就是我向往的自由生活吧～",
    author: "",
    blurb: "小众景点 · 沙田港 · 美人鱼小镇。",
    cover: "/media/notes/68ece5b5000000000303b244.jpg",
  },
];

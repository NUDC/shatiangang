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
  {
    url: "https://www.xiaohongshu.com/explore/6a9044ee000000002003275d?xsec_token=ABpWN-SOHx-KIPnJjLeMyFWaZ1uCnNDZpGnn9dLTjZUwQ=&xsec_source=pc_search&source=web_explore_feed",
    title: "沙田港海钓免费钓点开车直发",
    author: "",
    blurb: "石斑、滑仔、泥猛、金鼓鱼，水深约 13 米，适合休闲垂钓。",
    cover: "/media/notes/6a9044ee000000002003275d.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/6819989a000000002200721c?xsec_token=ABfoMjcBHGsxVZeA_8eUBJKiwgJtePYFw74qju5tIinUc=&xsec_source=pc_search&source=web_explore_feed",
    title: "宣传下广西的一个海边小镇（沙田镇）",
    author: "",
    blurb: "依海而生的小镇：买码头海鲜、看日落、赶海挖螺，附自驾/高铁交通攻略。",
    cover: "/media/notes/6819989a000000002200721c.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/696114b7000000001a033093?xsec_token=ABjRyHL8bpnS4oLo3dSDMUQrcpqycTIKgCUPb_NlKMagI=&xsec_source=pc_search&source=web_explore_feed",
    title: "据说这是北海较冷门赶海地",
    author: "",
    blurb: "距北海 100 多公里的合浦沙田港，冷门赶海地。",
    cover: "/media/notes/696114b7000000001a033093.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/689a42ee0000000025012142?xsec_token=AB9WAWmD-wOpTqXPpdPeVrNraQbnPPLmqiZJUSwm5bk4g=&xsec_source=pc_search&source=web_explore_feed",
    title: "我看到了，沙田坠美的日落🌄",
    author: "",
    cover: "/media/notes/689a42ee0000000025012142.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/6a0c62b6000000003700d8b4?xsec_token=ABFbq6I71RDT-67PHsMLnopksXWw0vo5AbMZT9YVw0QDM=&xsec_source=pc_search&source=web_explore_feed",
    title: "广西合浦沙田打卡美人鱼小镇",
    author: "",
    blurb: "没想到家门口就有打卡的地方 · 沙田美人鱼小镇。",
    cover: "/media/notes/6a0c62b6000000003700d8b4.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/67ad88a9000000001701fff8?xsec_token=ABgIRFUMB-_0_8_97wpbQNhnnVEJdP9ZZZENQdzr27jfc=&xsec_source=pc_search&source=web_explore_feed",
    title: "合浦沙田镇沙田港",
    author: "",
    blurb: "航拍 · 赶海。",
    cover: "/media/notes/67ad88a9000000001701fff8.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/68abf95b000000001d02d7fe?xsec_token=ABILzfzA28BfITd0UK7npXDvaToOJw5_xhhZvilgxKcdk=&xsec_source=pc_search&source=web_explore_feed",
    title: "玉林周边 北海合浦沙田港",
    author: "",
    blurb: "沙田港的晚霞，这里有和银滩一样细软的白沙子。",
    cover: "/media/notes/68abf95b000000001d02d7fe.jpg",
  },
  {
    url: "https://www.xiaohongshu.com/explore/69f9fd7f000000003601fc92?xsec_token=ABTntfKuAwt4lpDAZcpoVixSCC8q-VXAUxs4vqWjAd66Y=&xsec_source=pc_search&source=web_explore_feed",
    title: "宝藏露营地-合浦沙田港",
    author: "",
    blurb: "露营/停车/潮汐实用攻略：帐篷含烧烤桌 50、过夜 98，沙滩边有水管冲洗。",
    cover: "/media/notes/69f9fd7f000000003601fc92.jpg",
  },
];

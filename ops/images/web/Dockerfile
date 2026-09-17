# 沙田港文旅站 —— 静态站点镜像。
#
# 与 wego-stockquant 的 web 镜像同一个路子：**产物是构建好的 dist，镜像里不跑 npm**。
# 前端构建依赖 node_modules，把它塞进镜像构建会让上下文膨胀十几倍，
# 而且目标机没有必要装 Node。
#
# 这个站点比 quant 那个更彻底：它**只有**静态产物，没有后端容器、没有数据库。
# 整个运行时就是一份 nginx 配置加一棵目录树。
FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

# 纯静态：配置直接落 conf.d，无需 envsubst（改明文密钥后已无密钥要注入）。
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 8090

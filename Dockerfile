# Node.js 20をベースイメージとして使用
FROM node:20-slim

# 作業ディレクトリを設定
WORKDIR /usr/src/app

# 依存関係をインストール
COPY package*.json ./
RUN npm install --only=production

# アプリのソースコードをコピー
COPY . .

# サーバーを起動
CMD [ "npm", "start" ]
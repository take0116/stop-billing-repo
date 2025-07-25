# Node.js 20���x�[�X�C���[�W�Ƃ��Ďg�p
FROM node:20-slim

# ��ƃf�B���N�g����ݒ�
WORKDIR /usr/src/app

# �ˑ��֌W���C���X�g�[��
COPY package*.json ./
RUN npm install --only=production

# �A�v���̃\�[�X�R�[�h���R�s�[
COPY . .

# �T�[�o�[���N��
CMD [ "npm", "start" ]
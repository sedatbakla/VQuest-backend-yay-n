FROM node:20-alpine

# Çalışma dizinini oluştur
WORKDIR /usr/src/app

# Bağımlılık dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Kaynak kodları kopyala
COPY . .

# Nodemon için global kurulum (isteğe bağlı, ama geliştirme için faydalı)
RUN npm install -g nodemon

# Portu dışarı aç (Standart Express portu, env'den de alınabilir)
EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"]

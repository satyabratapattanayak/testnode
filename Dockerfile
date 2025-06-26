# Use Node.js official LTS image
FROM node:14.21.0

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Expose port (default: 5000)
EXPOSE 5000

# Start the app
CMD ["npm", "start"]

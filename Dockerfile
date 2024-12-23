# Use Node 18 as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy rest of the application
COPY . .

# Build the application

# Expose the port the app runs on
EXPOSE 3001

# Command to run the app
CMD ["npm", "run", "dev"]
# Use an official Node.js runtime as a parent image
FROM node:19.5.0-alpine

# Set the Node.js memory limit
ENV NODE_OPTIONS=--max-old-space-size=1106

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Build your application (if applicable)
# RUN npm run build

# Ensure the upload directory exists
# This directory will be overwritten by the volume at runtime
RUN mkdir -p /usr/src/app/uploads

# Expose the port your app runs on
EXPOSE 4004

# Start your application
CMD ["npm", "start"]

# Use the lightweight Nginx Alpine image
FROM nginx:alpine

# Copy all the static web files (HTML, CSS, JS) to the Nginx serving directory
COPY . /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]

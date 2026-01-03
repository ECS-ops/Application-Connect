
# Application-Connect 2.0 - Beginner Deployment Guide

This guide is designed for someone with **zero technical experience** to deploy this application to a live server. Follow these steps exactly, one by one.

---

## Phase 1: Buying a Server

You need a computer in the cloud (a Virtual Private Server or VPS) to run the software 24/7.

1.  Go to [DigitalOcean.com](https://www.digitalocean.com) and sign up.
2.  Click **Create** -> **Droplets**.
3.  **Region**: Select the one closest to you (e.g., Bangalore, London).
4.  **Choose an Image**: Select **Ubuntu 22.04 LTS** (Operating System).
5.  **Choose Size**: Select **Basic**, then **Regular Disk Type**. Pick the **$6/month** option (1GB RAM is enough).
6.  **Authentication Method**: Choose **Password**. Create a strong password (write it down!).
7.  Click **Create Droplet**.
8.  Wait for the IP Address to appear (e.g., `192.168.1.50`).

---

## Phase 2: Connecting to Your Server

You will use a "Terminal" to control the server.

**For Windows Users:**
1.  Download and install [PuTTY](https://www.putty.org/).
2.  Open PuTTY. In "Host Name", paste your Server IP Address.
3.  Click **Open**.
4.  Login as: `root`
5.  Password: (The one you created in Phase 1). *Note: You won't see the cursor move while typing the password. Just type it and hit Enter.*

**For Mac/Linux Users:**
1.  Open your **Terminal** app.
2.  Type: `ssh root@YOUR_SERVER_IP` (Replace `YOUR_SERVER_IP` with the numbers from DigitalOcean).
3.  Type yes if asked, then enter your password.

---

## Phase 3: Installing Software on the Server

Copy and paste these commands into your terminal one by one. Press **Enter** after each block.

**1. Update the System**
```bash
sudo apt update
sudo apt upgrade -y
```

**2. Install Node.js (The engine that runs the code)**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs build-essential
```

**3. Install Nginx (The web server)**
```bash
sudo apt install -y nginx
```

**4. Install PM2 (Keeps the app running forever)**
```bash
sudo npm install -g pm2
```

---

## Phase 4: Uploading the Code

We will clone the code from your repository. (Assuming you have this code in a GitHub repository. If not, you need to upload it there first).

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/YOUR_GITHUB_USERNAME/application-connect.git /var/www/application
    ```
    *(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)*.

2.  **Go into the folder**
    ```bash
    cd /var/www/application
    ```

---

## Phase 5: Configuring the Backend (Database)

1.  **Go to backend folder**
    ```bash
    cd backend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Security Key**
    We need to create a secret file.
    ```bash
    nano .env
    ```
    Inside the screen that opens, paste this:
    ```
    PORT=5000
    JWT_SECRET=MySuperSecretPasswordChangeThis123!
    ```
    Press `Ctrl+X`, then `Y`, then `Enter` to save.

4.  **Start the Backend**
    ```bash
    pm2 start server.js --name "application-api"
    ```

5.  **Save the process list**
    ```bash
    pm2 save
    pm2 startup
    ```
    *(If it gives you a command to run, copy and paste that command)*.

---

## Phase 6: Configuring the Frontend (Website)

1.  **Go back to main folder**
    ```bash
    cd ..
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Build the Website**
    This converts the code into a webpage.
    ```bash
    npm run build
    ```
    *(This might take 1-2 minutes)*.

---

## Phase 7: Making it Live (Nginx)

We need to tell the web server where to find your files.

1.  **Delete default config**
    ```bash
    sudo rm /etc/nginx/sites-enabled/default
    ```

2.  **Create new config**
    ```bash
    sudo nano /etc/nginx/sites-available/application
    ```

3.  **Paste this configuration:**
    *(Copy this entire block exactly)*
    ```nginx
    server {
        listen 80;
        server_name _;

        # Serve the Frontend Website
        location / {
            root /var/www/application/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Send API requests to the Backend
        location /api {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            client_max_body_size 10M;
        }
    }
    ```

4.  **Save and Exit**
    Press `Ctrl+X`, then `Y`, then `Enter`.

5.  **Activate the site**
    ```bash
    sudo ln -s /etc/nginx/sites-available/application /etc/nginx/sites-enabled/
    ```

6.  **Test configuration**
    ```bash
    sudo nginx -t
    ```
    *(It should say "syntax is ok")*

7.  **Restart Nginx**
    ```bash
    sudo systemctl restart nginx
    ```

---

## Phase 8: You are Done!

1.  Open your web browser.
2.  Type in your Server IP Address (e.g., `http://192.168.1.50`).
3.  You should see the Login Screen!

### **Default Login Credentials:**
*   **Username:** `admin`
*   **Password:** `password123`

**Next Steps:**
1.  Log in immediately.
2.  Go to **Admin Panel** -> **Users**.
3.  Click Edit on the `admin` user and change the password.
4.  Go to **Projects** and create your first project.

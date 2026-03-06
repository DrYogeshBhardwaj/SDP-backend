# Deployment Guide: Sinaank Digital Pause (SDP)

## 📦 Project Overview

This is a **client-side only** web application. It relies on `localStorage` for data persistence, meaning there is no backend database to configure.
**Technology Stack:** HTML5, CSS3, Vanilla JavaScript.

## 🚀 How to Deploy

### 1. File Selection

Upload the contents of the root directory **excluding** `_archive` and `.git` folders.

**Required Files & Folders:**

- `assets/` (Images, Icons)
- `css/` (Stylesheets)
- `js/` (Application Logic)
- `index.html` (Home)
- `login.html` (User Login - *Admin Blocked*)
- `secure_admin_login.html` (Admin Login - *Secret Entry*)
- `admin_panel.html` (Admin Dashboard)
- `seeder.html` (Active Seeder Dashboard)
- `seeder_offer.html` (Seeder Program Info)
- `seeder_form.html` (Seeder Application)
- `seeder_confirm.html` (Application Success)
- `dashboard_178.html` (Single User Dashboard)
- `dashboard_580.html` (Family Dashboard)
- `buyer*.html` (Product Pages)

### 2. Admin Security (CRITICAL)

- **Do not publish** `secure_admin_login.html` in your site navigation.
- Share the URL `yoursite.com/secure_admin_login.html` **ONLY** with authorized administrators.
- Verify `login.html` blocks admin access after deployment.

### 3. Cache Busting

- Key scripts include a version tag (e.g., `src="js/store.js?v=2026.3"`).
- If you update the code, increment this version number in all HTML files to ensure users get the new code immediately.

## 🧹 Maintenance & Cleanup

- A folder named `_archive/` has been created containing old/unused files (`login_original.html`, etc.).
- **Do not upload** the `_archive/` folder to your public web server.

## 🧪 Post-Deployment Verification

1. **User Flow**: Purchase -> Register/Login -> Dashboard.
2. **Admin Flow**: Access `secure_admin_login.html` -> Login -> Admin Panel.
3. **Security**: Attempt Admin login on public `login.html` -> Should be BLOCKED.

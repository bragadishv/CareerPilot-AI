# CareerPilot AI — AI Job Accelerator Platform

CareerPilot AI is a full-stack AI-powered career assistant built for freshers, job seekers, and career switchers. It helps users upload their resume, check ATS score, identify missing skills, generate career roadmaps, prepare interview questions, and download a professional PDF resume analysis report.

## Live Demo

Frontend: https://career-pilot-ai-steel.vercel.app
Backend: https://careerpilot-ai-backend-xjdv.onrender.com

## GitHub Repository

https://github.com/bragadishv/CareerPilot-AI

## Project Overview

CareerPilot AI is designed as a SaaS-style resume analysis and career guidance platform. Users can create an account, upload their resume PDF, select a target job role, and instantly receive a detailed career improvement report.

The platform includes authentication, MongoDB database storage, user-specific analysis history, Free/Premium plan logic, Razorpay payment integration, and PDF report generation.

## Key Features

* User Signup and Login
* JWT Authentication
* Resume PDF Upload
* Resume Text Extraction
* ATS Score Calculation
* Role-Based Skill Matching
* Missing Skill Identification
* Resume Improvement Suggestions
* Career Roadmap Generator
* Interview Question Generator
* Skill Gap Action Plan
* PDF Report Download
* MongoDB Analysis History
* User-Specific Dashboard
* Free and Premium Plan Logic
* Razorpay Payment Gateway Integration
* Premium Activation After Successful Payment
* Frontend Deployment on Vercel
* Backend Deployment on Render

## Tech Stack

### Frontend

* React
* Vite
* JavaScript
* jsPDF
* Razorpay Checkout
* Vercel Deployment

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcryptjs
* Multer
* pdf-parse
* Razorpay
* Render Deployment

### Database

* MongoDB Atlas

### Payment Gateway

* Razorpay Test Mode

## Folder Structure

```txt
CareerPilot-AI
│
├── backend
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend
│   ├── src
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public
│   ├── package.json
│   └── vite.config.js
│
└── .gitignore
```

## Main User Flow

1. User signs up or logs in.
2. User uploads a resume PDF.
3. Backend extracts resume text.
4. User selects a target role.
5. System calculates ATS score.
6. System shows matched and missing skills.
7. System generates suggestions, roadmap, interview questions, and action plan.
8. User can view analysis history.
9. Free users can analyze limited resumes.
10. Premium users can unlock unlimited analysis and PDF report download.
11. Razorpay payment activates Premium plan.

## Free and Premium Plan Logic

### Free Plan

* 3 resume analyses
* ATS score
* Skill gap report
* Career roadmap
* Basic history access

### Premium Plan

* Unlimited resume analyses
* PDF report download
* Extended history access
* Interview preparation questions
* Career roadmap and action plan

## Backend API Endpoints

### Authentication

```txt
POST /api/auth/signup
POST /api/auth/login
GET /api/auth/me
```

### Resume

```txt
POST /api/upload-resume
POST /api/analyze-resume
GET /api/analysis-history
```

### Payment

```txt
POST /api/payment/create-order
POST /api/payment/verify
```

### Health Check

```txt
GET /
GET /api/health
```

## Environment Variables

### Backend `.env`

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PREMIUM_AMOUNT=19900
```

### Frontend Vercel Environment Variable

```env
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com
```

## Local Setup

### Clone Repository

```bash
git clone https://github.com/bragadishv/CareerPilot-AI.git
cd CareerPilot-AI
```

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend will run on:

```txt
http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on:

```txt
http://localhost:5173
```

## Deployment

### Backend

Backend is deployed on Render.

Important Render settings:

```txt
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### Frontend

Frontend is deployed on Vercel.

Important Vercel settings:

```txt
Root Directory: frontend
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

## Security Notes

* `.env` is ignored using `.gitignore`
* API keys and database credentials are stored in Render/Vercel environment variables
* Passwords are hashed using bcryptjs
* Protected routes use JWT authentication
* Razorpay payment verification is handled on the backend

## Project Purpose

This project was built as a full-stack portfolio project to demonstrate real-world SaaS application development skills, including frontend development, backend API development, database integration, authentication, payment gateway integration, deployment, and product thinking.

## Author

Built by Bragadish Venkatramanan.

## Status

Completed MVP and deployed successfully.

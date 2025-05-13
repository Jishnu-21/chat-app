
# 💬 ChatApp

A full-stack real-time chat application built with:

- **Frontend:** React + Tailwind CSS  
- **Backend:** Node.js + Express.js + MongoDB

---

## 🚀 Features

- User registration & login (authentication)
- Real-time chat functionality
- Secure backend with MongoDB
- Concurrently running frontend and backend
- Environment variable support for easy configuration

---

## 🛠️ Getting Started

### 1. Clone the repository

git clone https://github.com/your-username/chatapp.git
cd chatapp
2. Install dependencies
bash
Copy
Edit
npm install
This will install both client and server dependencies using concurrently.

3. Set up environment variables
Create .env files in both the client and server directories using the provided .env.example as a reference.

📁 You can find .env.example files for guidance.

4. Run the application
bash
Copy
Edit
npm run dev
This will concurrently start both:

Client on: http://localhost:5173

Server on: http://localhost:5000

⚙️ Configuration Notes
When running the app locally, update the API endpoint used in:

bash
Copy
Edit
client/src/service/api.ts
Replace the production link with your local backend:


Edit
const BASE_URL = "http://localhost:5000/"; // for local dev
🧪 Test the App
Go to http://localhost:5173

Create an account or log in

Start chatting in real time!




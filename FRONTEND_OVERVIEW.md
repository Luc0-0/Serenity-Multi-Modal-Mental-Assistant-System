# Serenity Frontend Documentation

## Overview
Serenity's frontend is a responsive, modern web application built with **React** and **Vite**. It provides a calming, intuitive interface for users to engage with mental health tools, including meditation, journaling, and AI chat.

## Technology Stack
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (configured via PostCSS) & CSS Modules
- **Routing**: React Router DOM
- **HTTP Client**: Native `fetch` / Custom API wrappers
- **State Management**: React Hooks (`useState`, `useContext`, `useReducer`)

## Project Structure
```
frontend/
├── public/             # Static assets
├── src/
│   ├── assets/         # Images, global styles
│   ├── components/     # Reusable UI components (Header, Footer, Cards)
│   ├── context/        # React Contexts (AuthContext, ThemeContext)
│   ├── hooks/          # Custom hooks
│   ├── layouts/        # Page layouts
│   ├── pages/          # Main route components (Home, Login, Dashboard)
│   ├── services/       # API integration modules
│   ├── utils/          # Helper functions
│   ├── App.jsx         # Root component & Routing configuration
│   └── main.jsx        # Entry point
├── Dockerfile          # Frontend container definition
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies and scripts
```

## Key Features
- **Responsive Design**: Optimized for mobile and desktop views.
- **Authentication Flow**: Protected routes for Dashboard, Journal, and Profile.
- **Tools**:
    - **Meditate**: Guided breathing and relaxation visualizers.
    - **Journal**: Rich text entry with security.
    - **Insights**: Visualizations of emotional data.
    - **Chat**: Real-time interface for AI companion.

## Setup & Development

### Prerequisites
- Node.js (v18+) and npm.
- Docker (optional).

### Running Locally
1.  **Install Dependencies**:
    ```bash
    cd frontend
    npm install
    ```
2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

### Environment Variables
Create a `.env` file in the `frontend` root:
```env
VITE_API_URL=http://localhost:8000
```

## Docker Deployment
The frontend can be containerized using the provided `Dockerfile`.
It is included in the root `docker-compose.yml`.

```bash
# Build and run with docker-compose
docker-compose --env-file .env.docker up frontend
```

## Building for Production
To create an optimized production build:
```bash
npm run build
```
Output will be in the `dist/` directory, ready to be served by any static file server (Nginx, Apache, etc.).

## Linting
```bash
npm run lint
```
Uses `eslint` with React-specific plugins.

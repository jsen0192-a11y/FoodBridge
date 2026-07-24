const getApiDocsHtml = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodBridge REST API Documentation</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;850&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #151b2c;
      --border: #232c45;
      --primary: #10b981;
      --primary-hover: #059669;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --post: #10b981;
      --get: #3b82f6;
      --put: #eab308;
      --delete: #ef4444;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      display: flex;
      min-height: 100vh;
    }
    
    .sidebar {
      width: 280px;
      background-color: var(--card-bg);
      border-right: 1px solid var(--border);
      padding: 2rem 1.5rem;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
    }
    
    .logo {
      font-family: 'Outfit', sans-serif;
      font-weight: 850;
      font-size: 1.5rem;
      color: var(--primary);
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .logo span {
      color: #ffffff;
    }
    
    .nav-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      margin-top: 1.5rem;
    }
    
    .nav-link {
      display: block;
      color: var(--text);
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      margin-bottom: 0.25rem;
      transition: background 0.2s;
    }
    
    .nav-link:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    .content {
      margin-left: 280px;
      flex: 1;
      padding: 3rem;
      max-width: 900px;
    }
    
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    
    .lead {
      color: var(--text-muted);
      font-size: 1.1rem;
      margin-bottom: 3rem;
    }
    
    .section {
      margin-bottom: 4rem;
      scroll-margin-top: 2rem;
    }
    
    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.75rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-bottom: 2rem;
    }
    
    .endpoint {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    
    .method {
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      text-transform: uppercase;
      color: #ffffff;
    }
    
    .method.post { background-color: var(--post); }
    .method.get { background-color: var(--get); }
    .method.put { background-color: var(--put); }
    .method.delete { background-color: var(--delete); }
    
    .path {
      font-family: monospace;
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    .desc {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-bottom: 1rem;
    }
    
    .auth-badge {
      font-size: 0.75rem;
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--primary);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
    }
    
    .code-block {
      background-color: var(--bg);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      font-family: monospace;
      font-size: 0.85rem;
      overflow-x: auto;
      margin-top: 0.75rem;
      color: #34d399;
    }
    
    .code-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo">🥗 FoodBridge <span>API Docs</span></div>
    
    <div class="nav-title">Authentication</div>
    <a href="#auth-register" class="nav-link">POST /register</a>
    <a href="#auth-login" class="nav-link">POST /login</a>
    <a href="#auth-verify" class="nav-link">POST /verify-otp</a>
    <a href="#auth-refresh" class="nav-link">POST /refresh</a>
    <a href="#auth-google" class="nav-link">POST /google</a>
    
    <div class="nav-title">Donations</div>
    <a href="#donations-create" class="nav-link">POST /donations</a>
    <a href="#donations-list" class="nav-link">GET /donations</a>
    <a href="#donations-nearby" class="nav-link">GET /nearby</a>
    <a href="#donations-track" class="nav-link">GET /:id/tracking</a>
  </div>
  
  <div class="content">
    <h1>REST API Technical Specifications</h1>
    <p class="lead">Interactive documentation map for FoodBridge endpoints, authorization headers, and request validators.</p>
    
    <!-- AUTH SECTION -->
    <div class="section" id="auth">
      <h2 class="section-title">Authentication Endpoints</h2>
      
      <!-- REGISTER -->
      <div class="endpoint" id="auth-register">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/auth/register</span>
        </div>
        <p class="desc">Register a new User with validation schema checks. Generates verification code sent via Nodemailer email.</p>
        <div class="code-title">Request Body Payload Schema:</div>
        <pre class="code-block">{
  "name": "Olive Bistro",
  "email": "olive@bistro.com",
  "password": "securepassword123",
  "phone": "9876543210",
  "role": "donor" // "donor" | "ngo" | "volunteer"
}</pre>
      </div>

      <!-- LOGIN -->
      <div class="endpoint" id="auth-login">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/auth/login</span>
        </div>
        <p class="desc">Log in using email/password. Returns JWT Access token and HTTP-only refresh tokens.</p>
        <div class="code-title">Response JSON Structure:</div>
        <pre class="code-block">{
  "token": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "name": "Olive Bistro",
    "role": "donor",
    "isEmailVerified": true
  }
}</pre>
      </div>

      <!-- VERIFY OTP -->
      <div class="endpoint" id="auth-verify">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/auth/verify-otp</span>
        </div>
        <p class="desc">Verify the 6-digit email confirmation code to activate the user profile.</p>
        <pre class="code-block">{
  "email": "olive@bistro.com",
  "otp": "123456"
}</pre>
      </div>
    </div>
    
    <!-- DONATIONS SECTION -->
    <div class="section" id="donations">
      <h2 class="section-title">Food Donation Management</h2>
      
      <!-- CREATE DONATION -->
      <div class="endpoint" id="donations-create">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/donations</span>
          <span class="auth-badge">Bearer Auth</span>
        </div>
        <p class="desc">Submit a new food listing. Triggers Cloudinary compression and Gemini AI freshness, categories, and servings estimates.</p>
        <div class="code-title">Payload parameters:</div>
        <pre class="code-block">{
  "foodName": "Fresh Salad Bowls",
  "quantity": "25 servings",
  "foodType": "veg",
  "pickupTime": "2026-07-18T18:00:00Z",
  "address": "Lavelle Road, Bangalore",
  "lat": 12.9716,
  "lng": 77.5946,
  "image": "data:image/jpeg;base64,..."
}</pre>
      </div>

      <!-- TRACKING -->
      <div class="endpoint" id="donations-track">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/donations/:id/tracking</span>
          <span class="auth-badge">Bearer Auth</span>
        </div>
        <p class="desc">Retrieve live courier tracking details, OSRM optimal routing coordinates array, and drive time ETA in minutes.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

module.exports = { getApiDocsHtml };

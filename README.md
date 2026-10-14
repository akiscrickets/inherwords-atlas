# InHerWords - Global Gender Equality Atlas

An interactive world map that visualizes gender inequality through the Gender Inequality Index (GII) and provides a platform for women to share their stories and experiences.

## 🌍 Features

- **Interactive World Map**: Explore countries colored by their Gender Inequality Index scores
- **Story Sharing**: Submit personal stories and experiences in a safe, supportive environment
- **Admin Dashboard**: Secure admin interface for story approval and map pin management
- **Real-time Updates**: Stories appear as map pins immediately after approval
- **Data Visualization**: Clear legend and information about the Gender Inequality Index
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Privacy-Focused**: Anonymous sharing options and secure data handling

## 🚀 Live Demo

Visit the live site: https://inherwords.vercel.app

## 🔑 Admin Access

- **Admin Login**: `/admin/login`
- **Admin Dashboard**: `/admin` (requires authentication)

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet with custom choropleth visualization
- **Authentication**: JWT tokens
- **Data Storage**: Local JSON files for map pins, Google Sheets for story submissions

## 🚀 Deployment on Vercel


### Setup Instructions:

1. **Deploy to Vercel**: Connect your GitHub repository to Vercel

### Admin Access After Deployment:
- Visit `https://your-app.vercel.app/admin/login`
- Use the credentials you set in environment variables
- Access the admin dashboard to approve stories and manage map pins

## 📊 Data Sources

- Gender Inequality Index data from UN Human Development Reports
- Country boundaries from world.geo.json
- Story pins stored in local JSON file and managed through admin interface

## 📁 Project Structure

```
inherwords-atlas/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Homepage with interactive map
│   │   ├── submit/            # Story submission page
│   │   ├── admin/             # Admin interface
│   │   │   ├── login/         # Admin login page
│   │   │   └── page.tsx       # Admin dashboard
│   │   └── api/               # API routes
│   │       ├── map-pins/      # Map pin data
│   │       ├── submit-story/  # Story submissions
│   │       └── admin/         # Admin API endpoints
│   ├── components/            # React components
│   │   ├── InteractiveMapClient.tsx  # Main map component
│   │   ├── SimpleHeader.tsx          # Navigation header
│   │   └── ...
│   └── data/                  # Local data storage
│       └── map-pins.json      # Approved story pins
├── public/                    # Static assets (images, icons)
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# See docs/DEPLOYMENT.md for Google Sheets setup

# Start development server
npm run dev

# Build for production
npm run build
```

## 📝 Contributing

We welcome contributions to improve the platform and support women's voices worldwide.

## 📄 License

This project is created to support women's rights and gender equality awareness.

## 🤝 Contact

For questions or support, please reach out through email: akisckt23@gmail.com.

---

*"Women's rights are human rights" - Supporting equality and empowerment worldwide.*

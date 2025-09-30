// Environment configuration

export const config = {
  // Contact information
  contact: {
    email: 'info@charmtop.com.hk',
    phone: '+852 28511328',
    whatsapp: '+852 9404 5487',
    address: {
      en: "9/F Unit B, CNT Commercial Building, 302 Queen's Road Central, HK",
      zh: '香港皇后大道中302號北海商業大廈9樓B室'
    }
  },
  
  // Social media links
  social: {
    facebook: 'https://facebook.com/itsquare',
    twitter: 'https://twitter.com/itsquare',
    linkedin: 'https://linkedin.com/company/itsquare',
    instagram: 'https://instagram.com/itsquare'
  },
  
  // API endpoints
  api: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://amplify-test.d1gzwnduof06os.amplifyapp.com',
    timeout: 10000
  },
  
  // Feature flags
  features: {
    googleMaps: true, // Enabled with provided config
    analytics: true,
    newsletter: true
  },
  
  // Google Maps configuration
  googleMap: {
    enable: true,
    map_api_key: "AIzaSyB_RobNJzyLG0kZlkpcNsjPx4QN07I4n3M",
    map_latitude: "22.284911309837845",
    map_longitude: "114.15032180669813",
    map_marker: "images/marker.png",
    map_id: "8f51c45b7cd9a219"
  },
  
  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'ap-east-1',
    bucketName: process.env.AWS_S3_BUCKET || 'itsquareupdatedcontent'
  }
};
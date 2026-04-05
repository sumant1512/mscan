// Environment configuration for production
export const environment = {
  production: true,
  apiUrl: '/api',
  otpExpiryMinutes: 5,
  tokenRefreshThreshold: 5 * 60 * 1000,
  domainBase: 'mscan.com', // Replace with your actual domain
  enableSubdomainRouting: true,
  scanBaseUrl: 'https://mscan.app' // Base URL encoded in QR codes for public scan landing
};

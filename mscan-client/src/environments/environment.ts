// Environment configuration
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  otpExpiryMinutes: 5,
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes in ms
  domainBase: 'localhost', // For subdomain routing
  enableSubdomainRouting: true // Feature flag for subdomain support
};

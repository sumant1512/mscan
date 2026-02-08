import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubdomainService {
  
  /**
   * Get the current subdomain from the hostname
   * Returns null if on root domain
   */
  getCurrentSubdomain(): string | null {
    const hostname = window.location.hostname;
    const baseDomain = environment.domainBase;
    
    // Handle localhost without subdomain
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('0.0.0.0')) {
      return null;
    }
    
    // Handle subdomain.localhost (local development)
    if (hostname.endsWith('.localhost')) {
      const parts = hostname.split('.');
      // subdomain.localhost has 2 parts, so parts[0] is subdomain
      return parts.length >= 2 ? parts[0] : null;
    }
    
    // Handle subdomain.domain.tld (production)
    const domainRegex = new RegExp(`\\.${baseDomain.replace('.', '\\.')}$`);
    
    // Check if hostname ends with our base domain
    if (!domainRegex.test(hostname)) {
      // Not our domain, treat as root
      return null;
    }
    
    // Extract subdomain by removing base domain
    const subdomain = hostname.replace(domainRegex, '');
    
    // Return null if no subdomain (root domain)
    return subdomain || null;
  }
  
  /**
   * Check if currently on root domain (no subdomain)
   */
  isRootDomain(): boolean {
    return this.getCurrentSubdomain() === null;
  }
  
  /**
   * Build a URL for a specific subdomain
   */
  buildSubdomainUrl(slug: string, path: string = '/'): string {
    const protocol = window.location.protocol;
    const baseDomain = environment.domainBase;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    return `${protocol}//${slug}.${baseDomain}${port}${path}`;
  }
  
  /**
   * Redirect to a specific subdomain
   */
  redirectToSubdomain(slug: string, path: string = '/'): void {
    const url = this.buildSubdomainUrl(slug, path);
    window.location.href = url;
  }
  
  /**
   * Redirect to root domain
   */
  redirectToRootDomain(path: string = '/'): void {
    const protocol = window.location.protocol;
    const baseDomain = environment.domainBase;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    window.location.href = `${protocol}//${baseDomain}${port}${path}`;
  }
  
  /**
   * Get the base URL for the current subdomain (for API calls)
   */
  getApiBaseUrl(): string {
    if (!environment.enableSubdomainRouting) {
      console.log('[SubdomainService] Subdomain routing disabled, using default API URL:', environment.apiUrl);
      return environment.apiUrl;
    }

    const subdomain = this.getCurrentSubdomain();
    if (!subdomain) {
      console.log('[SubdomainService] No subdomain detected, using default API URL:', environment.apiUrl);
      return environment.apiUrl;
    }

    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port.replace('4200', '3000')}` : ':3000';
    const baseDomain = environment.domainBase;
    const apiUrl = `${protocol}//${subdomain}.${baseDomain}${port}/api`;

    console.log('[SubdomainService] Subdomain detected:', subdomain, '| API URL:', apiUrl);
    return apiUrl;
  }
}

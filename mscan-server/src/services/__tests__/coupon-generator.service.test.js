const CouponGenerator = require('../coupon-generator.service');

describe('CouponGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new CouponGenerator();
  });

  describe('generateCouponCode', () => {
    it('should generate a valid 12-character alphanumeric code', () => {
      const code = generator.generateCouponCode();
      expect(code).toHaveLength(12);
      expect(code).toMatch(/^[A-Z0-9]{12}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 1000; i++) {
        codes.add(generator.generateCouponCode());
      }
      expect(codes.size).toBe(1000);
    });
  });

  describe('generateQRData', () => {
    it('should include all required fields', () => {
      const coupon = {
        coupon_code: 'ABC123XYZ789',
        tenant_id: 1,
        discount_type: 'FIXED_AMOUNT',
        discount_value: 100,
        coupon_points: 50,
        expiry_date: '2024-12-31T23:59:59.000Z'
      };

      const result = generator.generateQRData(coupon);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('text');

      const qrData = JSON.parse(result.data);
      expect(qrData.couponCode).toBe('ABC123XYZ789');
      expect(qrData.tenantId).toBe(1);
      expect(qrData.discountType).toBe('FIXED_AMOUNT');
      expect(qrData.discountValue).toBe(100);
      expect(qrData.couponPoints).toBe(50);
      expect(qrData.expiryDate).toBe('2024-12-31T23:59:59.000Z');
    });

    it('should default coupon_points to 0 if not provided', () => {
      const coupon = {
        coupon_code: 'TEST123',
        tenant_id: 1,
        discount_type: 'PERCENTAGE',
        discount_value: 20,
        expiry_date: '2024-12-31T23:59:59.000Z'
      };

      const result = generator.generateQRData(coupon);
      const qrData = JSON.parse(result.data);

      expect(qrData.couponPoints).toBe(0);
    });

    it('should use custom base URL if provided', () => {
      const coupon = {
        coupon_code: 'TEST123',
        tenant_id: 1,
        discount_type: 'FIXED_AMOUNT',
        discount_value: 100,
        coupon_points: 50,
        expiry_date: '2024-12-31T23:59:59.000Z'
      };

      const customUrl = 'https://tenant.mscan.com';
      const result = generator.generateQRData(coupon, customUrl);

      expect(result.url).toBe(`${customUrl}/scan/TEST123`);
      const qrData = JSON.parse(result.data);
      expect(qrData.verifyUrl).toBe(`${customUrl}/scan/TEST123`);
    });

    it('should use /scan/ instead of /verify/ for mobile scan flow', () => {
      const coupon = {
        coupon_code: 'TEST123',
        tenant_id: 1,
        discount_type: 'FIXED_AMOUNT',
        discount_value: 100,
        coupon_points: 50,
        expiry_date: '2024-12-31T23:59:59.000Z'
      };

      const result = generator.generateQRData(coupon);
      expect(result.url).toContain('/scan/');
      expect(result.url).not.toContain('/verify/');
    });
  });

  describe('generateQRCodeImage', () => {
    it('should generate QR code URL with correct parameters', async () => {
      const couponCode = 'TEST123';
      const verificationUrl = 'https://mscan.app/scan/TEST123';

      const qrCodeUrl = await generator.generateQRCodeImage(couponCode, verificationUrl);

      expect(qrCodeUrl).toContain('https://api.qrserver.com/v1/create-qr-code/');
      expect(qrCodeUrl).toContain('size=300x300');
      expect(qrCodeUrl).toContain(encodeURIComponent(verificationUrl));
    });

    it('should handle special characters in URL', async () => {
      const couponCode = 'TEST123';
      const verificationUrl = 'https://mscan.app/scan/TEST123?app=mobile&user=1';

      const qrCodeUrl = await generator.generateQRCodeImage(couponCode, verificationUrl);

      expect(qrCodeUrl).toContain(encodeURIComponent(verificationUrl));
    });
  });
});

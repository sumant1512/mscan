import { Page } from "@playwright/test";
import { PageHelper } from "./helpers.js";
import { TEST_DATA } from "./test-config.js";

/**
 * Tenant Management Page Object
 */
export class TenantPage extends PageHelper {
  constructor(page: Page) {
    super(page);
  }

  async navigateToTenantList() {
    await this.navigateToMenuItem("Tenant Management", "View Tenants");
  }

  async createTenant(tenantData = TEST_DATA.newTenant) {
    // Click Create Tenant button to open the form
    await this.page.click(
      'button:has-text("Create Tenant"), button:has-text("+ Create Tenant")'
    );
    await this.waitForLoadingToComplete();

    // Fill the form using actual field IDs
    await this.page.fill("input#tenant_name", tenantData.companyName);
    await this.page.fill("input#subdomain_slug", tenantData.subdomain);

    // Wait for subdomain validation (the form checks availability)
    await this.page.waitForTimeout(1500); // Wait for debounce and validation

    await this.page.fill("input#contact_person", tenantData.contactName);
    await this.page.fill("input#email", tenantData.email);

    if (tenantData.phone) {
      await this.page.fill("input#phone", tenantData.phone);
    }

    // Submit the form
    await this.page.click('button[type="submit"]:has-text("Create Tenant")');
    await this.waitForLoadingToComplete();
  }

  async editTenant(
    oldName: string,
    newData: Partial<typeof TEST_DATA.newTenant>
  ) {
    // Click edit button on the tenant row
    await this.clickTableRowAction(oldName, "Edit");
    await this.waitForLoadingToComplete();

    // Wait for form to load
    await this.page.waitForSelector("form", {
      state: "visible",
      timeout: 5000,
    });

    // Update fields using actual form IDs
    if (newData.companyName) {
      await this.page.fill("input#tenant_name", newData.companyName);
    }
    if (newData.contactName) {
      await this.page.fill("input#contact_person", newData.contactName);
    }
    if (newData.email) {
      await this.page.fill("input#email", newData.email);
    }
    if (newData.phone) {
      await this.page.fill("input#phone", newData.phone);
    }

    // Submit the form
    await this.page.click('button[type="submit"]:has-text("Update Tenant")');
    await this.waitForLoadingToComplete();
  }

  async toggleTenantStatus(tenantName: string) {
    await this.clickTableRowAction(tenantName, "Deactivate");
    await this.waitForLoadingToComplete();
  }
}

/**
 * Coupon Management Page Object
 */
export class CouponPage extends PageHelper {
  constructor(page: Page) {
    super(page);
  }

  async navigateToCouponList() {
    await this.navigateToMenuItem("Rewards", "Coupon List");
  }

  async createCoupon(couponData = TEST_DATA.newCoupon) {
    // Navigate to create coupon page via menu or button
    const createButton = this.page.locator(
      'button:has-text("Create Coupon"), button:has-text("+ Create")'
    );
    if (
      await createButton
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await createButton.first().click();
    } else {
      // Navigate via menu
      await this.navigateToMenuItem("Rewards", "Create Coupon");
    }
    await this.waitForLoadingToComplete();

    await this.fillFieldByLabel("Offer Title", couponData.offerTitle);
    await this.fillFieldByLabel("Description", couponData.offerDescription);
    await this.fillFieldByLabel("Terms", couponData.termsAndConditions);
    await this.fillFieldByLabel("Valid From", couponData.validFrom);
    await this.fillFieldByLabel("Valid Until", couponData.validUntil);
    await this.fillFieldByLabel(
      "Max Redemptions",
      couponData.maxRedemptions.toString()
    );
    await this.fillFieldByLabel(
      "Discount Value",
      couponData.discountValue.toString()
    );

    // Select category
    await this.page.selectOption("select", couponData.category);

    await this.clickButton("Create");
    await this.waitForLoadingToComplete();
  }

  async editCoupon(
    couponTitle: string,
    newData: Partial<typeof TEST_DATA.newCoupon>
  ) {
    await this.clickTableRowAction(couponTitle, "Edit");
    await this.waitForLoadingToComplete();

    if (newData.offerTitle) {
      await this.fillFieldByLabel("Offer Title", newData.offerTitle);
    }
    if (newData.discountValue) {
      await this.fillFieldByLabel(
        "Discount Value",
        newData.discountValue.toString()
      );
    }

    await this.clickButton("Save");
    await this.waitForLoadingToComplete();
  }

  async toggleCouponStatus(couponTitle: string) {
    await this.clickTableRowAction(couponTitle, "Deactivate");
    await this.waitForLoadingToComplete();
  }
}

/**
 * Credit Management Page Object
 */
export class CreditPage extends PageHelper {
  constructor(page: Page) {
    super(page);
  }

  async navigateToCreditRequests() {
    // For tenant admin: Navigate to Credits > Request Credits
    // For super admin: Navigate to Credit Requests > Pending Approvals
    const isTenant = this.page.url().includes("/tenant/");
    if (isTenant) {
      await this.navigateToMenuItem("Credits", "Request Credits");
    } else {
      await this.navigateToMenuItem("Credit Requests", "Pending Approvals");
    }
  }

  async navigateToCreditApprovals() {
    // Credit Approvals is accessed via Credit Requests > Pending Approvals
    await this.navigateToMenuItem("Credit Requests", "Pending Approvals");
  }

  async requestCredits(creditData = TEST_DATA.creditRequest) {
    // Check if form is already visible or if we need to click a button to open it
    const amountInput = this.page.locator('input[type="number"], input[name*="amount"], input[placeholder*="amount"], input[formControlName="amount"]').first();
    const formAlreadyVisible = await amountInput.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!formAlreadyVisible) {
      // Try to click button to open form/modal
      const openFormButton = this.page.locator('button:has-text("Request Credits"), button:has-text("New Request"), button:has-text("Add Request")').first();
      const buttonExists = await openFormButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (buttonExists && await openFormButton.isEnabled()) {
        await openFormButton.click();
        await this.waitForLoadingToComplete();
      }
    }

    // Fill in the form fields
    await this.fillFieldByLabel("Amount", creditData.amount.toString());
    await this.fillFieldByLabel("Justification", creditData.justification);

    // Click submit button (it should now be enabled)
    const submitButton = this.page.locator('button:has-text("Submit"), button:has-text("Request Credits"), button:has-text("Create")').first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();
    await this.waitForLoadingToComplete();
  }

  async approveCredit(requestId: string) {
    await this.clickTableRowAction(requestId, "Approve");
    await this.clickButton("Confirm"); // Confirmation dialog
    await this.waitForLoadingToComplete();
  }

  async rejectCredit(requestId: string, reason: string) {
    await this.clickTableRowAction(requestId, "Reject");
    await this.fillFieldByLabel("Reason", reason);
    await this.clickButton("Confirm");
    await this.waitForLoadingToComplete();
  }
}

/**
 * Customer Registration Page Object
 */
export class CustomerPage extends PageHelper {
  constructor(page: Page) {
    super(page);
  }

  async navigateToCustomerRegistration() {
    // Navigate directly to customer registration route
    // Note: This feature may not have a menu item
    await this.page.goto(
      `${this.page.url().split("/tenant")[0]}/tenant/customers`
    );
    await this.waitForLoadingToComplete();
  }

  async registerCustomer(customerData = TEST_DATA.newCustomer) {
    // Wait for form to be visible
    await this.page.waitForSelector("form", {
      state: "visible",
      timeout: 5000,
    });

    // Fill company/tenant registration form fields
    await this.page.fill(
      "input#companyName",
      `${customerData.firstName} ${customerData.lastName} Corp`
    );
    await this.page.fill("input#contactEmail", customerData.email);
    await this.page.fill(
      "input#adminName",
      `${customerData.firstName} ${customerData.lastName}`
    );

    if (customerData.phone) {
      const phoneInput = this.page.locator("input#contactPhone");
      if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await phoneInput.fill(customerData.phone);
      }
    }

    // Submit the form
    const submitButton = this.page.locator('button[type="submit"]');
    await submitButton.click();
    await this.waitForLoadingToComplete();
  }
}

/**
 * User Management Page Object
 */
export class UserPage extends PageHelper {
  constructor(page: Page) {
    super(page);
  }

  async navigateToUserList() {
    // Users might be part of tenant details or a separate section
    // For now, try direct navigation to the users route
    await this.page.goto(
      `${this.page.url().split("/super-admin")[0]}/super-admin/users`
    );
    await this.waitForLoadingToComplete();
  }

  async createUser(userData = TEST_DATA.newUser) {
    await this.clickButton("Add User");
    await this.waitForLoadingToComplete();

    await this.fillFieldByLabel("Full Name", userData.fullName);
    await this.fillFieldByLabel("Email", userData.email);
    await this.fillFieldByLabel("Phone", userData.phone);
    await this.page.selectOption("select", userData.role);

    await this.clickButton("Create");
    await this.waitForLoadingToComplete();
  }
}

/**
 * Dashboard Page Object
 */
export class DashboardPage extends PageHelper {
  constructor(page: Page) {
    super(page);
  }

  async navigateToDashboard() {
    await this.navigateToMenuItem("Dashboard");
  }

  async verifyStatCardExists(statName: string) {
    await this.page.waitForSelector(`text=${statName}`);
  }
}

/**
 * Catalogue Management Page Object
 */
export class CataloguePage extends PageHelper {
  constructor(page: Page) {
    super(page);
  }

  async navigateToCategoryList() {
    await this.navigateToMenuItem("Catalogue", "View Categories");
  }

  async navigateToProductList() {
    await this.navigateToMenuItem("Catalogue", "View Products");
  }

  async navigateToCreateCategory() {
    await this.navigateToMenuItem("Catalogue", "Add Category");
  }

  async navigateToCreateProduct() {
    await this.navigateToMenuItem("Catalogue", "Add Product");
  }

  async createCategory(categoryData: { name: string; description?: string; icon?: string }) {
    // Navigate to create category page
    await this.navigateToCreateCategory();
    await this.waitForLoadingToComplete();

    // Fill category name
    const nameInput = this.page.locator('input#name, input[name="name"], input[formControlName="name"]').first();
    await nameInput.fill(categoryData.name);

    // Fill description if provided
    if (categoryData.description) {
      const descriptionInput = this.page.locator('textarea#description, textarea[name="description"], textarea[formControlName="description"]').first();
      if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descriptionInput.fill(categoryData.description);
      }
    }

    // Select icon if provided
    if (categoryData.icon) {
      const iconSelect = this.page.locator('select#icon, select[name="icon"], select[formControlName="icon"]').first();
      await iconSelect.selectOption({ value: categoryData.icon });
    }

    // Submit form
    await this.clickButton("Create");
    await this.waitForLoadingToComplete();
  }

  async createProduct(productData: { 
    name: string; 
    sku?: string; 
    description?: string; 
    price: string;
    currency?: string;
    categoryId?: string;
    imageUrl?: string;
  }) {
    // Navigate to create product page
    await this.navigateToCreateProduct();
    await this.waitForLoadingToComplete();

    // Fill product name
    const nameInput = this.page.locator('input#product_name, input[name="product_name"], input[formControlName="product_name"]').first();
    await nameInput.fill(productData.name);

    // Fill SKU if provided
    if (productData.sku) {
      const skuInput = this.page.locator('input#product_sku, input[name="product_sku"], input[formControlName="product_sku"]').first();
      await skuInput.fill(productData.sku);
    }

    // Fill description if provided
    if (productData.description) {
      const descriptionInput = this.page.locator('textarea#description, textarea[name="description"], textarea[formControlName="description"]').first();
      if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descriptionInput.fill(productData.description);
      }
    }

    // Fill price
    const priceInput = this.page.locator('input#price, input[name="price"], input[formControlName="price"]').first();
    await priceInput.fill(productData.price);

    // Select currency if provided
    if (productData.currency) {
      const currencySelect = this.page.locator('select#currency, select[name="currency"], select[formControlName="currency"]').first();
      if (await currencySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await currencySelect.selectOption(productData.currency);
      }
    }

    // Select category if provided
    if (productData.categoryId) {
      const categorySelect = this.page.locator('select#category_id, select[name="category_id"], select[formControlName="category_id"]').first();
      if (await categorySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await categorySelect.selectOption(productData.categoryId);
      }
    }

    // Fill image URL if provided
    if (productData.imageUrl) {
      const imageInput = this.page.locator('input#image_url, input[name="image_url"], input[formControlName="image_url"]').first();
      if (await imageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await imageInput.fill(productData.imageUrl);
      }
    }

    // Submit form
    await this.clickButton("Create");
    await this.waitForLoadingToComplete();
  }

  async searchCatalogue(searchTerm: string) {
    const searchBox = this.page.locator('input[type="text"][placeholder*="earch"], input[type="search"], input.search-input').first();
    await searchBox.fill(searchTerm);
    await this.page.waitForTimeout(1000); // Wait for search to complete
  }

  async filterProductsByCategory(categoryName: string) {
    const categoryFilter = this.page.locator('select[name*="category"], select[id*="category"]').first();
    await categoryFilter.selectOption({ label: categoryName });
    await this.page.waitForTimeout(1000); // Wait for filter to apply
  }
}

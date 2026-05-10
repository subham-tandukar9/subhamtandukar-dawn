// We're creating a custom "Add to Cart" button behavior.
// Shopify uses something called "custom elements" - think of it as
// creating your own HTML tag with custom functionality.

// This checks: "Has this element already been set up?"
// If yes, skip it. If no, set it up. This prevents duplicate registrations.
if (!customElements.get('product-form')) {

  customElements.define('product-form', class ProductForm extends HTMLElement {

    // constructor() runs automatically when the element appears on the page
    constructor() {
      super(); // always required - sets up the base HTML element

      // Find the <form> tag inside this element
      this.form = this.querySelector('form');

      // Make sure the variant ID field (size/color selection) is active
      this.variantIdInput.disabled = false;

      // Listen for when the user clicks "Add to Cart" (form submit)
      // When that happens, run our onSubmitHandler function
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));

      // Find the submit button and its text
      this.submitButton = this.querySelector('[type="submit"]');
      this.submitButtonText = this.submitButton.querySelector('span');

      // Check if errors should be hidden (set in Shopify theme settings)
      this.hideErrors = this.dataset.hideErrors === 'true';
    }


    // ─────────────────────────────────────────────────────────────
    // This runs when the user clicks "Add to Cart"
    // "async" means this function can wait for things (like network requests)
    // ─────────────────────────────────────────────────────────────
    async onSubmitHandler(evt) {

      // Stop the form from doing its default behavior (reloading the page)
      evt.preventDefault();

      // If button is already processing, don't do anything
      // This prevents double-clicking issues
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

      // ── Show loading state on the button ──
      this.submitButton.setAttribute('aria-disabled', 'true'); // disable the button
      this.submitButton.classList.add('loading');               // add loading style
      this.querySelector('.loading__spinner')?.classList.remove('hidden'); // show spinner
      this.handleErrorMessage(); // clear any old error messages

      // Collect all the form data (product ID, quantity, variant, etc.)
      const formData = new FormData(this.form);

      // ── Try to add the item to cart ──
      // "try/catch" means: try this code, and if something goes wrong, catch the error
      try {

        // Send a request to Shopify's cart API to add the item
        const response = await fetch('/cart/add.js', {
          method: 'POST',                                      // we're sending data
          headers: { 'X-Requested-With': 'XMLHttpRequest' },  // tells Shopify it's an AJAX request
          body: formData,                                      // the product data
        });

        // Convert the response into a JavaScript object we can read
        const data = await response.json();

        // ── Check if Shopify returned an error ──
        // e.g. item is sold out or unavailable
        if (!response.ok || data.status) {
          // Show the error message on the page
          this.handleErrorMessage(data.description || 'Could not add item to cart.');

          // If there's a "Sold Out" message element, show it
          const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
          if (soldOutMessage) {
            this.submitButton.setAttribute('aria-disabled', 'true');
            this.submitButtonText?.classList.add('hidden');   // hide "Add to Cart" text
            soldOutMessage.classList.remove('hidden');         // show "Sold Out" text
          }
          return; // stop here, don't continue
        }

        // ── Success! Item was added to cart ──
        await this.updateCartCount(); // update the cart icon number
        this.onAddSuccess(data);      // show success feedback to user

      } catch (err) {
        // Something unexpected went wrong (e.g. no internet connection)
        console.error('[Custom ATC] Error:', err);
        this.handleErrorMessage('Something went wrong. Please try again.');

      } finally {
        // This ALWAYS runs, whether success or error
        // Reset the button back to normal state
        this.submitButton.classList.remove('loading');
        this.querySelector('.loading__spinner')?.classList.add('hidden'); // hide spinner
        this.submitButton.removeAttribute('aria-disabled');               // re-enable button
      }
    }


    // ─────────────────────────────────────────────────────────────
    // This runs when the item is successfully added to cart
    // ─────────────────────────────────────────────────────────────
    onAddSuccess(item) {

      // Save the original button text so we can restore it later
      const originalText = this.submitButtonText?.textContent;

      // Change button text to show success
      if (this.submitButtonText) this.submitButtonText.textContent = '✓ Added to Cart';
      this.submitButton.style.backgroundColor = "green"; // add green color (defined in CSS)

      // After 2 seconds, restore the button back to normal
      setTimeout(() => {
        if (this.submitButtonText) this.submitButtonText.textContent = originalText;
        this.submitButton.style.backgroundColor = "white";
      }, 2000); // 2000 milliseconds = 2 seconds

      // If the page has a cart drawer (slide-out cart), open it
      const cartDrawer = document.querySelector('cart-drawer');
      if (cartDrawer) cartDrawer.open();

      // Fire a custom event — useful if you want other parts of your
      // code to react when something is added (e.g. analytics, popups)
      document.dispatchEvent(
        new CustomEvent('custom:cart:item-added', {
          detail: item,   // passes the item data along with the event
          bubbles: true   // allows the event to travel up the DOM
        })
      );
    }


    // ─────────────────────────────────────────────────────────────
    // Updates the cart count number shown in the header (e.g. "Cart (3)")
    // ─────────────────────────────────────────────────────────────
    async updateCartCount() {

      // Ask Shopify for the current cart data
      const res = await fetch('/cart.js');
      const cart = await res.json(); // cart.item_count = total number of items

      // Find the cart count bubble in the header and update the number
      document.querySelectorAll('.cart-count-bubble span').forEach((el, i) => {
        if (i === 0) el.textContent = cart.item_count;
      });
    }


    // ─────────────────────────────────────────────────────────────
    // Shows or hides error messages below the Add to Cart button
    // Pass a message string to show it, or nothing to hide it
    // ─────────────────────────────────────────────────────────────
    handleErrorMessage(errorMessage = false) {

      // If errors are disabled in theme settings, do nothing
      if (this.hideErrors) return;

      // Find the error message wrapper element (only search once, then reuse)
      this.errorMessageWrapper =
        this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return; // if it doesn't exist, stop

      // Find the actual error text element inside the wrapper
      this.errorMessage =
        this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      // Show the wrapper if we have a message, hide it if we don't
      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      // Set the error text
      if (errorMessage) this.errorMessage.textContent = errorMessage;
    }


    // ─────────────────────────────────────────────────────────────
    // A shortcut to get the hidden input that holds the variant ID
    // (variant = specific version of product e.g. "Red, Size M")
    // ─────────────────────────────────────────────────────────────
    get variantIdInput() {
      return this.form.querySelector('[name=id]');
    }

  });
}
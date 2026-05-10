if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.submitButton = this.querySelector('[type="submit"]');
      this.submitButtonText = this.submitButton.querySelector('span');
      this.hideErrors = this.dataset.hideErrors === 'true';
    }

    async onSubmitHandler(evt) {
      evt.preventDefault();
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

      this.submitButton.setAttribute('aria-disabled', 'true');
      this.submitButton.classList.add('loading');
      this.querySelector('.loading__spinner')?.classList.remove('hidden');
      this.handleErrorMessage();

      const formData = new FormData(this.form);

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || data.status) {
          this.handleErrorMessage(data.description || 'Could not add item to cart.');
          return;
        }

        await this.updateCartCount();
        this.onAddSuccess(data);
      } catch (err) {
        console.error('[Custom ATC] Error:', err);
        this.handleErrorMessage('Something went wrong. Please try again.');
      } finally {
        this.submitButton.classList.remove('loading');
        this.querySelector('.loading__spinner')?.classList.add('hidden');
        this.submitButton.removeAttribute('aria-disabled');
      }
    }

    onAddSuccess(item) {
      const originalText = this.submitButtonText?.textContent;

      if (this.submitButtonText) this.submitButtonText.textContent = '✓ Added to Cart';
      this.submitButton.style.backgroundColor = "green";
      this.submitButton.style.color = "white";

      setTimeout(() => {
        if (this.submitButtonText) this.submitButtonText.textContent = originalText;
        this.submitButton.style.backgroundColor = "white";
        this.submitButton.style.color = "black";
      }, 2000);

      document.dispatchEvent(
        new CustomEvent('custom:cart:item-added', {
          detail: item,
          bubbles: true
        })
      );
    }

    async updateCartCount() {
      const res = await fetch('/cart.js');
      const cart = await res.json();

      console.log("cart", cart);

      document.querySelectorAll('.cart-count-bubble span').forEach((el, i) => {
        if (i === 0) el.textContent = cart.item_count;
      });
    }

    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;

      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;

      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');
      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) this.errorMessage.textContent = errorMessage;
    }
  });
}
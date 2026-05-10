class CustomCheckout {
  constructor() {
    document.addEventListener('DOMContentLoaded', () => {
      this.attachCheckoutButtons();
    });
  }

  attachCheckoutButtons() {
    const checkoutButtons = document.querySelectorAll('#custom-checkout');

    checkoutButtons.forEach(button => {
      if (button.dataset.customCheckout === 'true') return;
      button.dataset.customCheckout = 'true';
      button.addEventListener('click', (evt) => this.onCheckoutClick(evt, button));
    });
  }

  async onCheckoutClick(evt, button) {
    evt.preventDefault();
    if (button.disabled) return;

    try {
      button.disabled = true;
      button.textContent = 'Processing...';

      const res = await fetch('/cart.js');
      const cart = await res.json();

      if (cart.item_count === 0) {
        alert('Your cart is empty!');
        return;
      }

      window.location.href = '/checkout';
    } catch (err) {
      console.error('[Custom Checkout] Error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Checkout';
    }
  }
}

const customCheckout = new CustomCheckout();
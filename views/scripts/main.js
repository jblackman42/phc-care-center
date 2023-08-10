class PhoneNumberInput extends HTMLElement {
  static get observedAttributes() {
    return ['placeholder', 'required', 'value'];
  }

  get value() {
    return this.inputElement ? this.inputElement.value : null;
  }

  set value(val) {
    if (this.inputElement) {
      this.inputElement.value = val;
    }
  }

  constructor() {
    super();
    this.inputElement = null;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const placeholderValue = this.getAttribute('placeholder') || '';
    const inputValue = this.getAttribute('value') || '';
    this.innerHTML = `
      <style>
        phone-number-input {
          /* Default styles go here. */
          display: grid;
        }
      </style>
      <input type="text"
        ${placeholderValue ? `placeholder="${placeholderValue}"` : ''}
        ${this.hasAttribute('required') ? 'required' : ''}
        ${inputValue ? `value="${inputValue}"` : ''}
      >
    `;
    this.inputElement = this.querySelector('input');
    this.inputElement.addEventListener('input', this._format.bind(this));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.inputElement) {
      if (name === 'placeholder') {
        this.inputElement.placeholder = newValue;
      } else if (name === 'required') {
        if (this.hasAttribute('required')) {
          this.inputElement.setAttribute('required', '');
        } else {
          this.inputElement.removeAttribute('required');
        }
      } else if (name === 'value') {
        this.inputElement.value = newValue;
      }
    }
  }

  _format(e) {
    const value = e.target.value.replace(/[^\d]/g, '');
    if (value.length <= 3) {
      e.target.value = value;
    } else if (value.length <= 6) {
      e.target.value = value.slice(0, 3) + '-' + value.slice(3);
    } else {
      e.target.value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
    }
  }
}

customElements.define('phone-number-input', PhoneNumberInput);
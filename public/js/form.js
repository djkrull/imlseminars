// Client-side form validation and enhancements
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('talkForm');

  if (form) {
    // Add real-time validation for abstract length
    const abstractField = document.getElementById('talkAbstract');
    if (abstractField) {
      const minLength = 50;

      // Create character counter
      const counter = document.createElement('small');
      counter.className = 'form-helper';
      counter.style.display = 'block';
      counter.style.marginTop = '0.5rem';

      abstractField.parentNode.appendChild(counter);

      // Update counter on input
      abstractField.addEventListener('input', function() {
        const currentLength = this.value.length;
        const remaining = minLength - currentLength;

        if (remaining > 0) {
          counter.textContent = `${remaining} more characters needed (minimum ${minLength} characters)`;
          counter.style.color = '#dc3545';
        } else {
          counter.textContent = `${currentLength} characters (✓)`;
          counter.style.color = '#28a745';
        }
      });

      // Trigger initial update
      abstractField.dispatchEvent(new Event('input'));
    }

    // Form submission confirmation
    form.addEventListener('submit', function(e) {
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();
      const talkTitle = document.getElementById('talkTitle').value.trim();
      const talkAbstract = document.getElementById('talkAbstract').value.trim();

      // Basic validation
      if (!firstName || !lastName || !email || !talkTitle || !talkAbstract) {
        alert('Please fill in all required fields.');
        e.preventDefault();
        return false;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        e.preventDefault();
        return false;
      }

      // Abstract length validation
      if (talkAbstract.length < 50) {
        alert('Abstract must be at least 50 characters long.');
        e.preventDefault();
        return false;
      }

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      return true;
    });

    // Enable HTML5 validation tooltips
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('invalid', function() {
        this.classList.add('error');
      });

      input.addEventListener('input', function() {
        this.classList.remove('error');
      });
    });
  }

  // Smooth scroll to errors
  const errorList = document.querySelector('.error-list');
  if (errorList) {
    errorList.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
